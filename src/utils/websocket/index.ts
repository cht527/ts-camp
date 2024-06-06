import EventEmitter from "eventemitter3";

import semverDiff from "semver/functions/diff";

const DAEDALUS_SCHEMAS_VERSION = "version id";

import {
  WebSocketClientEnum,
  WebSocketConfiguration,
  WebSocketResponseTypeEnum,
  type NotificationEventResult,
  type PingRequest,
  type Resolver,
  type SubscribeFn,
  type SubscribeResponse,
  type Subscription,
  type UnsubscribeResponse,
  type WsClientConfig,
  type WsClientInnerConfig,
  type WsClientInstance,
  type WsConfiguration,
  type WsEvents,
  type WsRequestData,
} from "./types";

export const getWsConfiguration = () =>
  new Promise<RequestResult<WebSocketConfiguration>>(() => "");

import {
  getInnerConfig,
  getWsUrl,
  isInternalEvent,
  isSubscribeKeyEnable,
  parseWebSocketMessage,
  IGNORED_TIME_DIFF,
  MAX_RESET_RETRY_COUNT,
  ALLOWED_RECONNECT_TIME_DIFF,
} from "./utils";

import { conditional } from "../tool";
import { Optional } from "@/typings/base";
import SystemModel, { getIsCurrentPageDead } from "@/model/systemCheck/system.model";
import { RequestResult } from "@/typings/xhr";
import dayjs from "dayjs";
import { checkNetworkStatus } from "@/model/systemCheck/service";
import { getDelaySeconds } from "../getDelaySeconds";

export type { WsClientInstance, SubscribeFn, NotificationEventResult };

export const enum WsStatus {
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CLOSED = "CLOSED",
}

const isProd = "isProd";

const SENTRY_SCOPE = "websocket";

const getMsg = (msg: string) => new Error(`[${SENTRY_SCOPE}] ${msg}`);

const getMsTime = () => new Date().getTime();

export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 共用同一链接
 */
export class WsClient extends EventEmitter<WsEvents> {
  /** WebSocket 连接实例，保证一个 client 仅有一个 */
  socket?: WebSocket;
  /** 当前 WebSocket 连接状态 */
  status: WsStatus = WsStatus.CLOSED;
  config: WsClientInnerConfig;
  /** 获取 websocket 配置的 Promise */
  private configurationPromise?: Promise<WsConfiguration | null>;
  /** 建立 WebSocket 连接的 Promise */
  private connectPromise?: Promise<WebSocket>;
  /** 关闭 WebSocket 连接的 Promise */
  private closePromise?: Promise<void>;
  /** 重连 Promise */
  private resubscribePromise?: Promise<boolean>;
  /** 是否是手动调用的关闭方法 */
  private explicitlyClosed = false;
  /** 连接重试次数 */
  private connectRetried = 0;
  /** 上次重连的时间 */
  private lastReconnectedTime?: number;
  /** 重置尝试重连的次数 */
  private resetRetryCount = 0;
  private heartbeatTimeout?: number;
  private heartbeatFailedCount = 0;
  private pingTask?: Resolver;
  private pingTimeout?: number;
  private closeTask?: Resolver;
  private requestUuid = 1;
  private subs: Dictionary<Subscription[]> = {};
  private reconnectTimer?: number;

  constructor(config?: WsClientConfig) {
    super();
    this.config = getInnerConfig(config);
    this.onMessage = this.onMessage.bind(this);
    this.onError = this.onError.bind(this);
    this.registerListeners();
  }

  private registerListeners() {
    // 自动关闭
    window.addEventListener("beforeunload", () => {
      this.close();
    });

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.tryResubscribe();
      }
    });
  }

  /** 当前 socket 是否是连接状态 */
  get connected() {
    return this.status === WsStatus.CONNECTED;
  }

  /** 获取 socket 实例。目前如无法获取 authToken 则无法获取 socket 实例 */
  private async getSocket(): Promise<Optional<WebSocket>> {
    if (this.socket) {
      return this.socket;
    }

    const wsUrl = await getWsUrl(this.config.url);

    console.info("get ws url", wsUrl?.length);

    if (!wsUrl) {
      // 无法自动 renew token 时无法获取 wsUrl
      return undefined;
    }

    console.log(console.log(["App-WebSocket-Connecting"]), {
      connectRetried: this.connectRetried,
    });
    return new WebSocket(wsUrl, this.config.protocol);
  }

  /** 建立 socket 连接，open 成功时才返回 socket */
  private async connect(): Promise<WebSocket> {
    if (this.socket) {
      return this.socket;
    }
    if (this.connectPromise) {
      // 共用同一 promise，保证并发时仅建立一个连接
      return this.connectPromise;
    }

    const connectPromise = new Promise<WebSocket>((resolve, reject) => {
      (async () => {
        const socket = await this.getSocket();

        if (!socket) {
          // 无法获取 ws socket，清空连接中的 promise
          this.connectPromise = undefined;
          reject(getMsg("failed on get authToken"));
          return;
        }

        this.status = WsStatus.CONNECTING;

        socket.onopen = () => {
          this.socket = socket;
          this.status = WsStatus.CONNECTED;
          this.connectPromise = undefined;
          this.emit("connect");
          if (this.connectRetried > 0) {
            this.resetRetryState();
            // 意外关闭后重连成功，需要重新订阅
            this.reconnect();
          }
          this.heartbeatCheck();
          console.info(`[ws] socket opened at ${new Date()}`);
          console.log(console.log("App-WebSocket-Connected"));
          resolve(socket);
        };
        socket.onclose = async (event) => {
          console.info(
            `[ws] socket ${
              this.explicitlyClosed ? "explicitly " : ""
            }closed at ${new Date()}`
          );
          console.log(console.log(["App-WebSocket-Closed"]), {
            ...this.getSystemStatus(),
            isExplicitlyClosed: this.explicitlyClosed,
          });
          if (this.status === WsStatus.CONNECTED) {
            // socket 关闭，并且之前是连接状态，触发 disconnect 事件
            this.emit("disconnect");
          }
          this.socket = undefined;
          this.status = WsStatus.CLOSED;
          this.connectPromise = undefined;
          this.clearHeartbeatCheck();
          this.clearResubscribe();

          if (!this.explicitlyClosed) {
            const { pageState, pageStateStartTime } =
              SystemModel.getInstance().get();

            if (
              pageState === "hidden" &&
              Date.now() - pageStateStartTime > ALLOWED_RECONNECT_TIME_DIFF
            ) {
              // 当 pageState 为 hidden 且超过 30 minutes 时，不自动重连，等待页面恢复可见时再重连
              this.resetRetryState();
              return reject(getMsg("page is hidden over 30 minutes"));
            }

            // 意外关闭，自动尝试重连
            this.connectRetried += 1;

            if (this.connectRetried <= this.config.retryTimes) {
              this.reconnectTimer = window.setTimeout(() => {
                const nowTime = getMsTime();

                if (
                  this.lastReconnectedTime &&
                  nowTime - this.lastReconnectedTime > IGNORED_TIME_DIFF
                ) {
                  // 如果 setTimeout 执行超过设置 timeout 时间，则重置重试次数
                  this.resetRetryCount += 1;
                  if (this.resetRetryCount <= MAX_RESET_RETRY_COUNT) {
                    // 只重置 MAX_RESET_RETRY_COUNT 次
                    this.connectRetried = 1;
                    // eslint-disable-next-line no-console
                    console.info(
                      `setTimeout execute timeout, reset retry count ${this.resetRetryCount} times`
                    );
                  }
                }
                this.lastReconnectedTime = nowTime;

                // eslint-disable-next-line no-console
                console.info(
                  `ws reconnect ${
                    this.connectRetried
                  } times on ${nowTime}, ${new Date(nowTime).toString()}`
                );
                this.connect().then(resolve).catch(reject);
              }, this.config.retryInterval);
            } else {
              // 多次重连尝试失败
              this.resetRetryState();
              this.tryCapture((extra) => {
                console.error({
                  scope: SENTRY_SCOPE,
                  message: "failed on connect",
                  level: "error",
                  extra: {
                    /** @link https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code */
                    code: event.code,
                    reason: event.reason,
                    ...extra,
                  },
                });
              });
              reject(getMsg("reconnect failed"));
            }
          } else {
            // 手动关闭
            this.explicitlyClosed = false;
            this.closeTask?.resolve();
            reject(getMsg("closed manually"));
          }
        };

        socket.onmessage = this.onMessage;
        socket.onerror = this.onError;
      })();
    });

    this.connectPromise = connectPromise;
    return connectPromise;
  }

  private async awaitConfiguration(): Promise<WsConfiguration | null> {
    if (this.configurationPromise) {
      return this.configurationPromise;
    }
    const configurationPromise =
      getWsConfiguration().then<WsConfiguration | null>(([res]) => {
        if (!res) {
          // 网络问题导致获取配置失败
          this.configurationPromise = undefined;
          return null;
        }
        return res.webSocketConfiguration.reduce<WsConfiguration>(
          (acc, option) => {
            if (option.client !== WebSocketClientEnum.Web) {
              return acc;
            }
            return {
              ...acc,
              [option.key]: option,
            };
          },
          {}
        );
      });

    this.configurationPromise = configurationPromise;
    return configurationPromise;
  }

  /** 确保连接建立成功之后再做其他操作。如未建立连接，会自动建立连接 */
  private async awaitConnect() {
    if (this.connected) {
      return true;
    }
    try {
      await this.connect();
      return true;
    } catch (e) {
      return false;
    }
  }

  async send(msg: WsRequestData) {
    const connected = await this.awaitConnect();

    if (!connected) {
      return;
    }
    this.socket?.send(JSON.stringify(msg));
  }

  private async subscribeTask(key: string, fn: SubscribeFn) {
    return new Promise<void>((resolve, reject) => {
      const subData = this.buildSubRequest(key, "subscribe");

      console.info(`[ws] subscribe ${key}`);
      const timeoutId = window.setTimeout(() => {
        this.handleSubscribeTimeout({ key, fn, reject, action: "subscribe" });
      }, this.config.responseTimeout);

      if (!this.subs[key]) {
        this.subs[key] = [];
      }

      // eslint-disable-next-line no-restricted-syntax
      this.subs[key]?.push({
        key,
        requestId: subData.requestId,
        fn,
        timeoutId,
        resolve,
        reject,
        retries: 0,
      });
      this.send(subData);
    });
  }

  /** 取消订阅，仅当当前订阅 key 剩下一个使用者时，向后端发送 unsubData */
  private async unsubscribeTask(key: string) {
    return new Promise<void>((resolve, reject) => {
      const subs = this.subs[key];

      if (!subs?.length || subs.length > 1) {
        return resolve();
      }
      // 仅剩一个的时候才会真正的 unsubscribe
      const sub = subs.at(0);

      if (!sub) {
        // null check
        return;
      }
      const unsubData = this.buildSubRequest(key, "unsubscribe");

      this.send(unsubData);
      const timeoutId = window.setTimeout(() => {
        this.handleSubscribeTimeout({
          key,
          fn: sub.fn,
          reject,
          action: "unsubscribe",
        });
      }, this.config.responseTimeout);

      sub.requestId = unsubData.requestId;
      sub.timeoutId = timeoutId;
      sub.resolve = resolve;
      sub.reject = reject;
      sub.retries = 0;
    });
  }

  async subscribe<T extends keyof WsEvents>(
    event: T,
    fn: WsEvents[T]
  ): Promise<boolean> {
    this.on(event, fn);
    if (isInternalEvent(event)) {
      return true;
    }
    const configuration = await this.awaitConfiguration();

    if (!configuration || !isSubscribeKeyEnable(event, configuration)) {
      return false;
    }
    const connected = await this.awaitConnect();

    if (!connected) {
      return false;
    }
    try {
      await this.subscribeTask(event, fn);
      return true;
    } catch (e) {
      this.tryCapture((extra) => {
        console.error({
          scope: SENTRY_SCOPE,
          message: "Subscribe event timeout",
          level: "warning",
          extra: {
            ...extra,
            error: String(e),
          },
        });
      });
      return false;
    }
  }

  async unsubscribe<T extends keyof WsEvents>(
    event: T,
    fn: WsEvents[T]
  ): Promise<boolean> {
    this.off(event, fn);
    if (isInternalEvent(event)) {
      return true;
    }

    try {
      await this.unsubscribeTask(event);
      const subs = this.subs[event];

      if (subs) {
        const newSubs = subs.filter((item) => item.fn !== fn);

        if (newSubs.length) {
          this.subs[event] = newSubs;
        } else {
          delete this.subs[event];
        }
      }
      return true;
    } catch (e) {
      this.tryCapture((extra) => {
        console.error({
          scope: SENTRY_SCOPE,
          message: "Unsubscribe event timeout",
          level: "warning",
          extra: {
            ...extra,
            error: String(e),
          },
        });
      });
      return false;
    }
  }

  /**
   * @link https://developer.mozilla.org/zh-CN/docs/Web/API/CloseEvent
   * @param [code = 1000] 默认 code 1000 - 正常关闭; 无论为何目的而创建, 该链接都已成功完成任务.
   * @param reason
   */
  async close(code = 1000, reason?: string) {
    if (!this.socket) {
      return;
    }
    if (this.closePromise) {
      return this.closePromise;
    }
    this.clearHeartbeatCheck();
    this.explicitlyClosed = true;
    this.socket.close(code, reason);
    return new Promise((resolve, reject) => {
      this.closeTask = { resolve, reject };
    });
  }

  private ping() {
    return new Promise<void>((resolve, reject) => {
      this.pingTask = { resolve, reject };
      const requestId = String(new Date().getTime());
      const pingData: PingRequest = { action: "ping", requestId };

      this.send(pingData);
      this.pingTimeout = window.setTimeout(() => {
        // ping 响应超时处理逻辑
        this.pingTimeout = undefined;
        // 超出重试限制
        this.pingTask = undefined;
        reject(getMsg("ping timeout"));
      }, this.config.responseTimeout);
    });
  }

  private onPingResp() {
    if (this.pingTimeout) {
      window.clearTimeout(this.pingTimeout);
      this.pingTimeout = undefined;
    }
    this.pingTask?.resolve();
    this.pingTask = undefined;
  }

  // 重新恢复所有订阅
  private resubscribe() {
    if (this.resubscribePromise) {
      return this.resubscribePromise;
    }
    this.resubscribePromise = this.awaitConnect()
      .then((connected) => {
        if (!connected) {
          return false;
        }
        const allSubs = Object.values(this.subs);

        this.subs = {};
        return Promise.all(
          allSubs.map((subs) =>
            Promise.all(
              (subs || []).map((sub) => this.subscribeTask(sub.key, sub.fn))
            )
          )
        )
          .then(() => true)
          .catch((e) => {
            this.tryCapture((extra) => {
              console.error({
                scope: SENTRY_SCOPE,
                message: "Resubscribe events timeout",
                level: "warning",
                extra: {
                  ...extra,
                  error: String(e),
                },
              });
            });
            return false;
          });
      })
      .finally(() => {
        this.resubscribePromise = undefined;
      });
    return this.resubscribePromise;
  }

  private tryResubscribe() {
    if (this.socket || this.resubscribePromise || this.reconnectTimer) {
      return;
    }
    if (Object.values(this.subs).some((items) => !!items && items.length > 0)) {
      // 页面恢复可见时，如果有订阅并且 WebSocket 未连接，则重新连接并恢复订阅
      this.resubscribe();
    }
  }

  private clearResubscribe() {
    // 浏览器休眠时可能 setTimeout 延迟很久，socket 断开时需要清除之前的 subscribe 任务
    Object.values(this.subs).forEach((subs = []) => {
      subs.forEach((sub) => window.clearTimeout(sub.timeoutId));
    });
    this.resubscribePromise = undefined;
  }

  private async reconnect() {
    // 恢复订阅
    const reconnected = await this.resubscribe();

    if (reconnected) {
      this.emit("reconnect");
    }
  }

  private clearHeartbeatCheck() {
    window.clearTimeout(this.heartbeatTimeout);
    this.heartbeatTimeout = undefined;
    this.heartbeatFailedCount = 0;
  }

  private heartbeatCheck() {
    const execute = async () => {
      try {
        await this.ping();
        if (this.status !== WsStatus.CONNECTED) {
          this.status = WsStatus.CONNECTED;
          this.emit("connect");
        }
        this.heartbeatFailedCount = 0;
        this.heartbeatCheck();
      } catch (e) {
        if (this.status !== WsStatus.DISCONNECTED) {
          this.status = WsStatus.DISCONNECTED;
          this.emit("disconnect");
        }
        this.heartbeatFailedCount += 1;
        if (this.heartbeatFailedCount >= this.config.retryTimes) {
          // 超出连续失败次数，关闭 socket 并重新连接及订阅
          await this.close();
          this.tryResubscribe();
        } else {
          // 继续 health check 等待响应。如果 socket 断开会 clearHeartbeatCheck
          this.heartbeatCheck();
        }
      }
    };

    this.heartbeatTimeout = window.setTimeout(() => {
      execute();
    }, this.config.heartbeatInterval);
  }

  /** 订阅消息响应 */
  private onResponse(data: SubscribeResponse | UnsubscribeResponse) {
    const subs = this.subs[data.eventResult.key];

    if (!subs) {
      return;
    }
    const sub = subs.find(({ requestId }) => requestId === data.requestId);

    if (sub) {
      window.clearTimeout(sub.timeoutId);
      sub.resolve();
      sub.retries = 0;
      console.info(`[ws] ${data.action} ${sub.key} success`);
    }
  }

  private onMessage(event: MessageEvent) {
    const data = parseWebSocketMessage(event.data);

    if (!data) {
      return;
    }
    const { schemasVersion, type } = data;

    switch (type) {
      case WebSocketResponseTypeEnum.Pong: {
        this.onPingResp();
        break;
      }
      case WebSocketResponseTypeEnum.Response: {
        this.onResponse(data);
        break;
      }
      case WebSocketResponseTypeEnum.Notification: {
        // 对于版本不兼容的消息，不处理，防止 Schema 结构变化导致页面出错
        const versionDiff = conditional(
          schemasVersion && semverDiff(schemasVersion, DAEDALUS_SCHEMAS_VERSION)
        );

        if (
          isProd &&
          versionDiff &&
          ["major", "premajor", "minor", "preminor"].includes(versionDiff)
        ) {
          SystemModel.getInstance().checkSystemUpdate();
          console.warn(
            `[ws] The message version '${schemasVersion}' is not compatible with the current version '${DAEDALUS_SCHEMAS_VERSION}'`
          );
          return;
        }
        this.emit(
          data.eventResult.key,
          data.eventResult.dataUnionType?.value,
          data.eventResult,
          data
        );
        break;
      }
      default: {
        // TODO unknown msg
        break;
      }
    }
  }

  private onError(event: Event) {
    this.emit("error", event);
  }

  private increaseReqUuid() {
    this.requestUuid += 1;
    if (this.requestUuid > 10000) {
      this.requestUuid = 1;
    }
    return this.requestUuid;
  }

  private resetRetryState() {
    if (this.reconnectTimer) {
      // 如果用户触发了 visibilitychange 重连并成功，需要清除自动重连 timer
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.connectRetried = 0;
    this.lastReconnectedTime = undefined;
    this.resetRetryCount = 0;
  }

  private getSystemStatus = () => {
    const {
      isNetworkAbnormal,
      isAuthExpired,
      isRenewing,
      pageState,
      pageStateStartTime,
    } = SystemModel.getInstance().get();
    const expireAt = dayjs().unix();

    return {
      isNetworkAbnormal,
      isAuthExpired,
      isRenewing,
      expireAt,
      expireAtStr:
        expireAt > 0 ? new Date(expireAt * 1000).toString() : undefined,
      pageState,
      pageStateStartTime,
    };
  };

  private async tryCapture(
    capture: (extra: ReturnType<typeof this.getSystemStatus>) => void
  ) {
    const systemModel = SystemModel.getInstance();
    const { isNetworkAbnormal, isAuthExpired, isRenewing } = systemModel.get();

    if (
      isNetworkAbnormal ||
      isAuthExpired ||
      isRenewing ||
      getIsCurrentPageDead()
    ) {
      return;
    }
    const isWeakNetwork = !(await checkNetworkStatus());

    if (isWeakNetwork) {
      // 打开系统网络异常提示
      systemModel.showNetworkAbnormalNotice();
    } else {
      const loginSuccess = await systemModel.checkLoginStatus();

      if (!loginSuccess) {
        return;
      }
      // 当前网络正常且认证未过期上报 sentry
      capture(this.getSystemStatus());
    }
  }

  private buildSubRequest<Action extends "subscribe" | "unsubscribe">(
    key: string,
    action: Action
  ) {
    const requestId = String(this.requestUuid);

    this.increaseReqUuid();
    return {
      action,
      key,
      requestId,
    };
  }

  private async handleSubscribeTimeout({
    key,
    action,
    fn,
    reject,
  }: {
    key: string;
    action: "subscribe" | "unsubscribe";
    fn: SubscribeFn;
    reject: Subscription["reject"];
  }) {
    const sub = this.subs[key]?.find((item) => item.fn === fn);

    if (!sub) {
      // null check
      return;
    }
    if (sub.retries < this.config.retryTimes) {
      const retryCount = sub.retries + 1;

      // 延迟一定时间后再重试，避免多个 event 同时重试
      await delay(getDelaySeconds(retryCount, 2) * 1000);
      const newSubData = this.buildSubRequest(key, action);
      const timeoutId = window.setTimeout(() => {
        this.handleSubscribeTimeout({ key, fn, reject, action });
      }, this.config.responseTimeout);

      console.info(
        `[ws] handle ${action} ${key} timeout, retry ${retryCount} times`
      );
      sub.requestId = newSubData.requestId;
      sub.timeoutId = timeoutId;
      sub.retries += 1;
      this.send(newSubData);
      return;
    }

    reject(getMsg(`${action} ${key} timeout`));
  }
}

// 不对外暴露 EventEmitter 的一些内部方法
export default new WsClient() as WsClientInstance;
