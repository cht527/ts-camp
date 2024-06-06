import { Optional } from "@/typings/base";
import { getFetch } from "@/utils/httpClient";
import axios, {
  AxiosError,
  AxiosResponse,
  CanceledError,
  InternalAxiosRequestConfig,
} from "axios";
import dayjs from "dayjs";

const checkNetworkWithoutAuthUrl = "https://somecdn.com/healthcheck.json";

const checkNetworkWithAuthUrl = "/health-check";

// 本次请求开始的时间（非原始请求，可能是 retry 请求）
export const REQUEST_START_AT_IN_HEADER = "X-Request-Start-At";

export const NETWORK_STATUS_AT_REQUEST_START = "networkStatusAtRequestStart";

export const NETWORK_STATUS_AT_REQUEST_END = "networkStatusAtRequestEnd";

export const OKTA_ACCESS_TOKEN_KEY = "accessToken";

export const OKTA_ID_TOKEN_KEY = "idToken";

export const ENABLE_IDEMPOTENT_API_RETRY = "enableIdempotentApiRetry";

export const CLIENT_VERSION_HTTP_HEADER = "X-APP-Client-Version";

export const MAINTENANCE_MODE_COUNTDOWN_HTTP_HEADER = 'X-Maintenance-Mode-Countdown';

export const MAINTENANCE_MODE_START_AT_HTTP_HEADER = 'X-Maintenance-Mode-Start-At';

/**
 * TODO: axios.isCancel 类型有问题，导致 TS narrow 错误
 * @see https://github.com/axios/axios/issues/5153
 */
export const isCanceledError = (
  error: unknown
): error is CanceledError<never> => axios.isCancel(error);

export const isSystemCheckUrl = (url?: string) => {
  if (!url) {
    return false;
  }
  return url === checkNetworkWithAuthUrl || url === checkNetworkWithoutAuthUrl;
};

export const isAuthExpired = (error: AxiosError) =>
  error.response?.status === 401 ||
  error.response?.headers["x-amzn-errortype"] ===
    "AuthorizerConfigurationException";

export const getHeaderFromConfig = (
  key: string,
  config?: InternalAxiosRequestConfig
) => {
  const value = config?.headers.get(key);

  return value ? String(value) : undefined;
};

export const isCachedResponse = (response: AxiosResponse) => {
  // 请求发起时间
  const requestTime = getHeaderFromConfig(
    REQUEST_START_AT_IN_HEADER,
    response.config
  );
  // 响应时间（Response 中的请求时间）
  const responseTime = response.headers.date;

  // 如果 请求发起时间 > 响应时间，则认为是从缓存中返回的响应
  return dayjs(requestTime).isAfter(dayjs(responseTime));
};

export type MaintenanceModeState = {
  countdown: number;
  startAt: number;
  serverTime: number;
  message?: string;
};
export type MaintenanceModeMessage = {
  inMaintenanceMode: boolean;
  state?: MaintenanceModeState;
};

export type MaintenanceState = Partial<
  Pick<MaintenanceModeState, "startAt" | "countdown" | "message">
>;

export const getMaintenanceState = () =>
  new Promise<Optional<MaintenanceModeState>>(() => "");

export const checkAuthStatus = () =>
  getFetch<{}>(checkNetworkWithAuthUrl, {
    headers: { "Cache-Control": "no-cache, no-store" },
    timeout: 2 * 1000,
    "axios-retry": {
      retries: 0,
    },
  })
    .then((response) => {
      // 请求有 response，代表状态为 2xx，才算登录成功

      return !!response;
    })
    .catch(() => false);

export const checkNetworkStatus = () =>
  getFetch(checkNetworkWithoutAuthUrl, {
    headers: { "Cache-Control": "no-cache, no-store" },
    timeout: 2 * 1000,
    "axios-retry": {
      retries: 0,
    },
  })
    .then((response) => {
      // 请求有 response 或 error status 存在，则都算网络连通
      const [data, { error }] = response;
      const errorResponseStatus = error?.response?.status;

      return !!data || !!errorResponseStatus;
    })
    .catch(() => false);

export const getMaintenanceInformation = (
  response: AxiosResponse
): Optional<MaintenanceState> => {
  const { headers } = response;
  const startAt = headers[MAINTENANCE_MODE_START_AT_HTTP_HEADER.toLowerCase()];
  const countdown =
    headers[MAINTENANCE_MODE_COUNTDOWN_HTTP_HEADER.toLowerCase()];

  return countdown !== undefined
    ? {
        startAt: Number(startAt),
        countdown: Number(countdown),
      }
    : undefined;
};
