import { AxiosRequestConfig } from 'axios';
import HttpInstance from './interceptors';

 // 全局拦截
 
 export const getFetch = <T = any>(
     url: string,
     params?: any,
     config?: AxiosRequestConfig 
 ): Promise<T> => HttpInstance.get(url, { ...config, params });
 
 export const postFetch = <T = any>(
     url: string,
     params?: any,
     config?: AxiosRequestConfig
 ): Promise<T> => HttpInstance.post(url, params, config);

 export function wrapperGetFetch<P>(
     commonUrl: string,
     url: string,
     config?: AxiosRequestConfig
 ) {
     return <T>(params: T) => getFetch<P>(`${commonUrl}${url}`, params, config);
 }
 
 export function wrapperPostFetch<P>(commonUrl: string, url: string) {
     return <T>(params: T) => postFetch<P>(`${commonUrl}${url}`, params);
 }
 


