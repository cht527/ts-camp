import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import lifecycle, { PageState, StateChangeEventListener } from "page-lifecycle";
import dayjs from "dayjs";

import Model from "../index";
import customizeLoop from "@/utils/customizeLoop";

import HttpInstance from "@/utils/httpClient/interceptors";

import {
  checkAuthStatus,
  checkNetworkStatus,
  isSystemCheckUrl,
  isAuthExpired,
  isCachedResponse,
  NETWORK_STATUS_AT_REQUEST_START,
  NETWORK_STATUS_AT_REQUEST_END,
  isCanceledError,
  CLIENT_VERSION_HTTP_HEADER,
  getMaintenanceInformation,
} from "./service";
import { callVisibilityChange } from "@/hooks/useVisibilityChange";
import { getMaintenanceState, MaintenanceState } from "../systemCheck/service";

import BroadcastModel, { BroadcastEventName } from "../broadcast.model";

export type { PageState };

export enum MaintenanceModeEnum {
  Unknown = -1,
  Disabled = 0,
  PrepareForMaintenance = 1,
  Maintaining = 2,
}

type SystemModelData = {
  initialized?: boolean;
  // 当前用户认证状态是否过期
  isAuthExpired: boolean;
  // 当前网络状态是否异常
  isNetworkAbnormal: boolean;
  // 是否正在 renew
  isRenewing: boolean;
  // 是否系统升级
  systemUpdated: boolean;
  pageState: PageState;
  pageStateStartTime: number;
  // 维护模式信息
  maintenanceMode: MaintenanceModeEnum;
  maintenanceState?: MaintenanceState;
};

type AxiosInterceptorInfo = { instance: AxiosInstance; id: number };

const localVersion: string = "TRIDENT_VERSION";
// 系统更新默认一小时检测一次
const DEFAULT_SYSTEM_UPDATE_CHECK_INTERVAL = 3600000;
// 维护模式检测间隔时间
const MAINTENANCE_CHECK_INTERVAL = 10000;

// 当前项目中的 axiosInstance
const systemAxiosInstances = [HttpInstance];

const isVisiblePageState = (pageState: PageState) =>
  pageState === "active" || pageState === "passive";

const isDeadPageState = (pageState: PageState) =>
  pageState === "frozen" || pageState === "terminated";

const PAGE_STATE_HEAP_EVENT_MAP: Record<PageState, string> = {
  active: "App-Page-Active",
  passive: "App-Page-Passive",
  hidden: "App-Page-Hidden",
  frozen: "App-Page-Frozen",
  terminated: "App-Page-Terminated",
};

export type PageStateChangedEvent = {
  pageState: PageState;
  isVisible: boolean;
  isDead: boolean;
};

class SystemModel extends Model<
  SystemModelData,
  {
    pageStateChanged: (event: PageStateChangedEvent) => void;
    logout: () => void;
  }
> {
  private static instance?: SystemModel;
  private authCheckCancelFunction?: () => void;
  private smsLiteAxiosInterceptor?: number;
  private systemAxiosInterceptors?: AxiosInterceptorInfo[];
  private systemUpdateTimer?: number;
  private maintenanceTimer?: number;

  private handleAxiosRequest = (config: InternalAxiosRequestConfig) => {
    const { headers } = config;
    const { isNetworkAbnormal } = this.get();

    headers.set(CLIENT_VERSION_HTTP_HEADER, localVersion);
    return {
      ...config,
      // add network status info
      [NETWORK_STATUS_AT_REQUEST_START]: !isNetworkAbnormal,
    };
  };

  stopMaintenanceStateChecker() {
    window.clearTimeout(this.maintenanceTimer);
    this.maintenanceTimer = undefined;
  }

  private setMaintenanceState(state: MaintenanceState) {
    const { countdown } = state;
    let maintenanceMode = MaintenanceModeEnum.Disabled;
    let maintenanceState = undefined;

    if (countdown !== undefined) {
      maintenanceMode =
        countdown > 0
          ? MaintenanceModeEnum.PrepareForMaintenance
          : MaintenanceModeEnum.Maintaining;
      maintenanceState = state;
    }
    const { initialized } = this.get();

    // 如果之前打开页面时，是维护状态（初始化失败），那么，当退出维护状态时，需要重新初始化
    if (
      initialized === false &&
      maintenanceMode === MaintenanceModeEnum.Disabled
    ) {
      /*
       * 如果首次打开页面时，就是维护模式，会初始化失败（initialized === false），此时会显示「初始化失败」的信息
       * 外面有「维护中」的占位图盖住了，所以看不到「初始化失败」的信息，还好
       * 当退出维护模式时，「维护中」的占位图被隐藏，「初始化失败」的信息就会露出来，体验不好
       * 所以这里先隐藏掉「初始化失败」的信息
       */
      this.set({
        initialized: undefined,
      });
      this.initialize();
    }
    this.set({
      maintenanceMode,
      maintenanceState,
    });
  }

  private loadMaintenanceState = async (defaultState?: MaintenanceState) => {
    const maintenanceState = await getMaintenanceState();
    const { startAt, countdown, message } = maintenanceState ?? {};
    const nonMaintenance = maintenanceState && countdown === undefined;

    /*
     * 非维护状态时，接口返回空数据（maintenanceState 为空对象）
     * 因网络故障等原因，导致接口请求失败时（maintenanceState 为 undefined），仍然可以使用 defaultState 作为「维护信息」
     */
    this.setMaintenanceState(
      nonMaintenance
        ? {}
        : {
            startAt: startAt ?? defaultState?.startAt,
            countdown: countdown ?? defaultState?.countdown,
            message,
          }
    );
  };

  scheduleCheckMaintenanceState(defaultState?: MaintenanceState) {
    // 因为对于每个接口请求，都会检查是否进入维护模式，而一个页面可能同时调用多个接口，所以需要减少调用频率
    if (this.maintenanceTimer) {
      return;
    }
    this.loadMaintenanceState(defaultState);
    const { maintenanceState } = this.get();
    const countdown = maintenanceState?.countdown ?? defaultState?.countdown;

    if (countdown === undefined) {
      return;
    }
    this.maintenanceTimer = window.setTimeout(
      () => {
        this.stopMaintenanceStateChecker();
        const { maintenanceState } = this.get();

        if (maintenanceState !== undefined) {
          this.scheduleCheckMaintenanceState(maintenanceState);
        }
      },
      countdown > 0
        ? Math.min(MAINTENANCE_CHECK_INTERVAL, countdown * 1000)
        : MAINTENANCE_CHECK_INTERVAL
    );
  }

  private handleAxiosResponseFulfilled = (response: AxiosResponse) => {
    /*
     * 断网时，浏览器可能使用缓存，此时，响应会正常返回，所以，需要排除这种情况
     * 只有真正网络请求成功时，才关闭系统网络异常提示
     */
    if (!isCachedResponse(response) && this.get().isNetworkAbnormal) {
      this.closeNetworkAbnormalNotice();
    }
    const maintenanceInformation = getMaintenanceInformation(response);

    if (maintenanceInformation !== undefined) {
      this.scheduleCheckMaintenanceState(maintenanceInformation);
    }
    return response;
  };

  private handleAxiosResponseRejected = async (error: Error | AxiosError) => {
    // 仅处理 axios 错误
    if (axios.isAxiosError(error)) {
      const isAuthFail = isAuthExpired(error);
      const cancelled = isCanceledError(error);

      // 处理认证过期
      if (isAuthFail) {
        this.setIsRenewing(true);
        const result = "renewAuthToken";

        this.setIsRenewing(false);
        if (!result) {
          // 展示认证过期提示
          this.showAuthExpiredNotice();
        }
      }
      const { config, request, response } = error;
      const maintenanceCountdown = response
        ? getMaintenanceInformation(response)
        : undefined;

      if (maintenanceCountdown !== undefined) {
        this.scheduleCheckMaintenanceState(maintenanceCountdown);
      }

      // 检查网络状态
      if (
        !(cancelled || isAuthFail) && // 不是取消和认证过期错误
        !!request && // 有请求详情
        !isSystemCheckUrl(config?.url) // 系统检测请求不进入网络异常处理（网络连通性、权限校验 等）
      ) {
        // 有 response 则证明请求成功
        const isWeakNetwork = response ? false : !(await checkNetworkStatus());

        // 打开系统网络异常提示
        if (isWeakNetwork) {
          this.showNetworkAbnormalNotice();
        } else {
          this.closeNetworkAbnormalNotice();
        }
      }

      // 此处不能直接解构 AxiosError，会影响 axios 后续逻辑判断，此处直接修改 Error 写入网络信息
      if (config) {
        config[NETWORK_STATUS_AT_REQUEST_END] = !this.get().isNetworkAbnormal;
      }
    }

    return Promise.reject(error);
  };

  private constructor() {
    super({
      data: {
        isAuthExpired: false,
        isNetworkAbnormal: false,
        isRenewing: false,
        systemUpdated: false,
        pageState: lifecycle.state,
        pageStateStartTime: Date.now(),
        maintenanceMode: MaintenanceModeEnum.Unknown,
      },
    });
    this.registerPageStateListener();
    this.registerNetworkListener();

    // 注册 axiosInstance request 拦截器，添加网络状态信息
    this.systemAxiosInterceptors = systemAxiosInstances.map((instance) => {
      const id = instance.interceptors.request.use(this.handleAxiosRequest);

      return { instance, id };
    });
    // 注册 axiosInstance response 拦截器（此处只注册 lite api，内部包含 okta 验证逻辑）
    this.smsLiteAxiosInterceptor = HttpInstance.interceptors.response.use(
      this.handleAxiosResponseFulfilled,
      this.handleAxiosResponseRejected
    );

    const broadcastModel = BroadcastModel.getInstance();

    broadcastModel.on(
      BroadcastEventName.BecomeUserChanged,
      this.handleBecomeUserChanged
    );
    broadcastModel.on(BroadcastEventName.SystemUpdate, this.showSystemUpdate);

    this.checkSystemUpdate();
    callVisibilityChange({
      onShow: () => {
        this.checkSystemUpdate();
        const { maintenanceState } = this.get();

        if (maintenanceState !== undefined) {
          this.scheduleCheckMaintenanceState(maintenanceState);
        }
      },
      onHide: () => {
        this.stopSystemUpdateCheck();
        this.stopMaintenanceStateChecker();
      },
    });
  }

  static getInstance() {
    if (!SystemModel.instance) {
      SystemModel.instance = new SystemModel();
    }
    return SystemModel.instance;
  }

  private registerPageStateListener() {
    lifecycle.addEventListener("statechange", this.handlePageStateChange);
  }

  private registerNetworkListener() {
    // 监听离线情况（还可通过 showNetworkAbnormalNotice 设置离线）
    window.addEventListener("offline", this.showNetworkAbnormalNotice);

    // 监听网络恢复情况（还可通过 closeNetworkAbnormalNotice 设置在线）
    customizeLoop(
      async () => {
        const { isNetworkAbnormal } = this.get();

        if (!isNetworkAbnormal) {
          return;
        }

        const networkConnected = await checkNetworkStatus();

        this.set({ isNetworkAbnormal: !networkConnected });
      },
      {
        fireOnPageShow: true,
        stopOnPageHide: true,
        interval: 10 * 1000,
        fireOnInit: true,
      }
    );
  }

  async initialize() {
    const loginUser = "get User";

    if (loginUser) {
      // 拉取系统下发 options
    } else {
      // 初始化失败时，确认是否在「维护中」，之后再显示初始化失败的提示
      await this.loadMaintenanceState();
    }
    this.set({ initialized: !!loginUser });
    return loginUser;
  }

  showNetworkAbnormalNotice = () => {
    this.set({ isNetworkAbnormal: true });
  };

  closeNetworkAbnormalNotice() {
    this.set({ isNetworkAbnormal: false });
  }

  setIsRenewing(isRenewing: boolean) {
    this.set({ isRenewing });
  }

  showAuthExpiredNotice() {
    console.info("showAuthExpiredNotice");

    this.set({ isAuthExpired: true });
    this.checkLoginStatusOnPageShow();
  }

  closeAuthExpiredNotice() {
    console.info("closeAuthExpiredNotice");

    this.set({ isAuthExpired: false });
    this.cancelCheckLoginLoop();
  }

  checkLoginStatus = async () => {
    const loginSuccess = await checkAuthStatus();

    if (loginSuccess) {
      this.closeAuthExpiredNotice();
    }
    return loginSuccess;
  };

  checkLoginStatusOnPageShow() {
    // 如果已有绑定事件，则返回
    if (this.authCheckCancelFunction) {
      return;
    }

    this.authCheckCancelFunction = callVisibilityChange({
      onShow: () => {
        this.checkLoginStatus();
      },
    });
  }

  cancelCheckLoginLoop() {
    if (this.authCheckCancelFunction) {
      this.authCheckCancelFunction();
      this.authCheckCancelFunction = undefined;
    }
  }

  stopSystemUpdateCheck() {
    window.clearTimeout(this.systemUpdateTimer);
  }

  scheduleSystemUpdateCheck() {
    this.stopSystemUpdateCheck();
    if (document.visibilityState === "visible") {
      this.systemUpdateTimer = window.setTimeout(() => {
        this.checkSystemUpdate();
      }, DEFAULT_SYSTEM_UPDATE_CHECK_INTERVAL);
    }
  }

  handleBecomeUserChanged = () => {
    window.location.reload();
  };

  showSystemUpdate = () => {
    this.set({
      systemUpdated: true,
    });
  };

  hideSystemUpdate() {
    this.set({
      systemUpdated: false,
    });
  }

  async checkSystemUpdate() {
    let { systemUpdated } = this.get();

    /*
     * 检测到系统有更新后，无需再次检测
     * 直到用户刷新页面，再重新开始定时检测
     */
    if (!systemUpdated) {
      const remoteVersion = "getRemoteSystemVersion";

      console.info(
        `[localVersion]: ${localVersion}\n[remoteVersion]: ${remoteVersion}`
      );

      systemUpdated = !!(remoteVersion && localVersion !== remoteVersion);
      this.set({
        systemUpdated,
      });
      this.scheduleSystemUpdateCheck();
    }
    return systemUpdated;
  }

  logout() {
    this.emit("logout");
    this.destroyInstance();
    BroadcastModel.getInstance().destroyInstance();
  }

  destroyInstance() {
    this.cancelCheckLoginLoop();
    lifecycle.removeEventListener("statechange", this.handlePageStateChange);
    window.removeEventListener("offline", this.showNetworkAbnormalNotice);

    // remove response interceptor
    if (this.smsLiteAxiosInterceptor) {
      HttpInstance.interceptors.response.eject(this.smsLiteAxiosInterceptor);
    }
    // remove request interceptors
    if (this.systemAxiosInterceptors) {
      this.systemAxiosInterceptors.forEach(({ instance, id }) => {
        instance.interceptors.request.eject(id);
      });
    }

    const broadcastModel = BroadcastModel.getInstance();

    broadcastModel.off(
      BroadcastEventName.BecomeUserChanged,
      this.handleBecomeUserChanged
    );
    broadcastModel.off(BroadcastEventName.SystemUpdate, this.showSystemUpdate);

    this.stopSystemUpdateCheck();
    this.stopMaintenanceStateChecker();

    this.destroy();
    SystemModel.instance = undefined;
  }

  private handlePageStateChange: StateChangeEventListener = ({
    newState: pageState,
    oldState,
  }) => {
    const oldStateTimeStr = dayjs(this.get().pageStateStartTime).format(
      "YYYY-MM-DD HH:mm:ss.SSS"
    );

    console.info(
      `[page state]: ${pageState}. last page state is ${oldState} at ${oldStateTimeStr}`
    );
    this.set({ pageState, pageStateStartTime: Date.now() });
    this.emit("pageStateChanged", {
      pageState,
      isVisible: isVisiblePageState(pageState),
      isDead: isDeadPageState(pageState),
    });
  };
}

export const getPageState = () => SystemModel.getInstance().get().pageState;

export const getIsCurrentPageDead = () => isDeadPageState(getPageState());

export default SystemModel;
