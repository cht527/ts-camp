import axios, { AxiosRequestConfig, CanceledError } from "axios";
import HttpInstance from "./interceptors";

// 全局拦截

export const getFetch = <T = any>(
  url: string,
  params?: any,
  config?: AxiosRequestConfig & { useCache?: boolean }
): Promise<T> => HttpInstance.get(url, { ...config, params });

export const postFetch = <T = any>(
  url: string,
  params?: any,
  config?: AxiosRequestConfig & { useCache?: boolean }
): Promise<T> => HttpInstance.post(url, params, config);

export function wrapperGetFetch<P>(
  commonUrl: string,
  url: string,
  config?: AxiosRequestConfig & { useCache?: boolean }
) {
  return <T>(params: T) => getFetch<P>(`${commonUrl}${url}`, params, config);
}

export function wrapperPostFetch<P>(
  commonUrl: string,
  url: string,
  config?: AxiosRequestConfig & { useCache?: boolean }
) {
  return <T>(params: T) => postFetch<P>(`${commonUrl}${url}`, params, config);
}

/**
 * TODO: axios.isCancel 类型有问题，导致 TS narrow 错误
 * @see https://github.com/axios/axios/issues/5153
 */
export const isCanceledError = (
  error: unknown
): error is CanceledError<never> => axios.isCancel(error);
