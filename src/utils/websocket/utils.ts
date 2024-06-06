import { Optional, PlainObject } from "@/typings/base";
import {
  BaseEvents,
  WebSocketResponseMessage,
  WebSocketTopicEnum,
  WsClientConfig,
  WsClientInnerConfig,
  WsConfiguration,
  WsEvents,
  WsResponseData,
} from "./types";

export const PROD_URL = "prod.cc";

export const DEV_URL = "dev.cc";

export const DEV_WSS_URL = "wss-test.cc";

/** 心跳检测间隔 */
export const HEARTBEAT_INTERVAL = 8000;

/**
 * 重连尝试间隔。
 * okta 有提前 30s 认为过期的 buffer，但是由于用户本地时间的误差，可能导致 3 次重连过程中本地判断 token 未过期实际已过期。
 * 这里设置重试时间间隔 30s，可以很大概率减少由于用户本地时间误差导致的 3 次重连失败的 sentry 上报。
 * RETRIES_INTERVAL 变更时需要保证 IGNORED_TIME_DIFF 的时间不能过短或者过长
 */
export const RETRIES_INTERVAL = 30000;

/**
 * 需要忽略的重试尝试时间。
 * 由于休眠时，浏览器 setTimeout 调度问题，可能出现过了很久才执行，这里过滤执行被延迟的执行的请求
 * @link https://docs.google.com/document/d/11FhKHRcABGS4SWPFGwoL6g0ALMqrFKapCk5ZTKKupEk/view
 */
export const IGNORED_TIME_DIFF = RETRIES_INTERVAL * 1.5;

/** 最大重置重连计数次数 */
export const MAX_RESET_RETRY_COUNT = 6;

/** 重试次数 */
export const RETRY_TIMES = 3;

/** 接口返回确认消息超时时间 */
export const RESPONSE_TIMEOUT = 10000;

/** 内部 event key Set */
export const BASE_EVENT_KEY_SET = new Set([
  "data",
  "error",
  "connect",
  "disconnect",
]);

/** 允许自动重连的时间差。30 分钟 = 30 * 60 * 1000 */
export const ALLOWED_RECONNECT_TIME_DIFF = 1800000;

/** 获取 WebSocket Url，需要拼接 AuthToken、BecomeUser query。如没有 AuthToken 则无法连接 */
export const getWsUrl = async (url: string): Promise<Optional<string>> => {
  let authToken = "token"; // oktaAuth.getAccessToken();
  const isExpired = false; // isAccessTokenExpired();

  console.info(
    `get ws url info: t length - ${authToken?.length}, isExpired: ${isExpired}`
  );

  if (!authToken || isExpired) {
    authToken = "renew token"; // await renewAndGetToken();

    console.info("new t length", authToken?.length);

    if (!authToken) {
      return undefined;
    }
  }

  const queries = `AuthToken=${authToken}&BecomeUser=user`;

  return `${url}?${queries}`;
};

export const TRIDENT_WEBSOCKET_BASE_URL = `wss://${
  "isProd" ? PROD_URL : DEV_WSS_URL
}/v1-api-ws`;

export const getInnerConfig = ({
  url = TRIDENT_WEBSOCKET_BASE_URL,
  retryTimes = RETRY_TIMES,
  heartbeatInterval = HEARTBEAT_INTERVAL,
  retryInterval = RETRIES_INTERVAL,
  responseTimeout = RESPONSE_TIMEOUT,
  ...config
}: WsClientConfig = {}): WsClientInnerConfig => ({
  url,
  retryTimes,
  heartbeatInterval,
  retryInterval,
  responseTimeout,
  ...config,
});

export const isInternalEvent = (
  event: keyof WsEvents
): event is keyof BaseEvents => BASE_EVENT_KEY_SET.has(event);

export const getTargetEnumFromKey = (
  key: string
): Optional<WebSocketTopicEnum> => {
  const [target] = key.split("/");

  return target as Optional<WebSocketTopicEnum>;
};

export const isSubscribeKeyEnable = (
  key: string,
  configMap: WsConfiguration
): boolean => {
  const targetEnum = getTargetEnumFromKey(key);

  if (!targetEnum) {
    return false;
  }
  const config = configMap[targetEnum];

  return config?.isWebSocketEnable ?? false;
};


export const parseJsonObjectString = <T extends PlainObject>(text: string) => {
    try {
      const json = JSON.parse(text);
  
      if (typeof json === 'object' && !Array.isArray(json) && json !== null) {
        return json as T;
      }
      console.error({
        scope: ['SENTRY_SCOPE'],
        message: 'parseJsonObjectString() error',
        level: 'error',
        extra: {
          json,
        },
      });
    } catch (error) {
        console.error({
        scope: ['SENTRY_SCOPE'],
        message: 'JSON.parse() error',
        level: 'error',
        extra: {
          rawString: text,
        },
      });
      return;
    }
  };

export const parseWebSocketMessage = (text: string) => {
  const result = parseJsonObjectString<WebSocketResponseMessage>(text);

  if (result?.type && result.message) {
    return result as WsResponseData;
  }
};
