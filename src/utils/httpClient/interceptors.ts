import CacheStore from '../axiosCache';

/**
 * 生成基础axios对象，并对请求和响应做处理
 * 前后端约定接口返回数据结构
 * {
 *    code:0,
 *    data:"成功",
 *    message:""
 * }
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// eslint-disable-next-line no-multi-assign
const cacheStore = (window.cacheStore = new CacheStore());

declare global {
  interface Window {
    cacheStore: CacheStore;
  }
}

const service = axios.create({
  baseURL: '/', // 本地做了反向代理
  timeout: 10000,
  responseType: 'json',
  withCredentials: true, // 是否允许带cookie这些
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
  },
});

// 请求处理
const requestHandler = (config: AxiosRequestConfig) => {
  // 若是有做鉴权token , 就给头部带上token
  // 若是需要跨站点,存放到 cookie 会好一点,限制也没那么多,有些浏览环境限制了 localstorage 的使用
  // 这里localStorage一般是请求成功后我们自行写入到本地的,因为你放在vuex刷新就没了
  // 一些必要的数据写入本地,优先从本地读取
  if (localStorage.token) {
    config.headers.Authorization = localStorage.token;
  }

  const { url, method, params, data: postData, headers } = config;
  //  单个请求config里使用了useCache
  if (
    (config as AxiosRequestConfig & { useCache: boolean }).useCache &&
    url &&
    method &&
    ['get', 'post'].includes(method.toLowerCase())
  ) {
    const cacheParams = {
      url,
      method: method.toLowerCase(),
      body: method.toLowerCase() === 'get' ? params : postData,
    };
    let data: any = cacheStore.getCache(cacheParams);
    if (data) {
      headers.cached = true; // 在errorhandler里会处理
      data = data.response;
      config.data = data;
      // 注意：这里给到responseHandler时参数就为传入的config了
      return Promise.reject(config);
    }
  }
  return config;
}

service.interceptors.request.use(
  requestHandler,
  error => Promise.reject(error)
);


// 返回处理
const responseHandler = (response: AxiosResponse) => {
  const isLoginPage = /login/.test(window.location.pathname);
  if (!isLoginPage && typeof response.data === 'string' && response.data.indexOf('<!DOCTYPE') === 0) {
    // 非登录页弹消息
    // message.error('请求出错了！');
    return Promise.reject('');
  }
  const res = response.data;

  if (res) {
    switch (res.code) {
      case 0:
        const conf = response.config || response;
        if ((conf as AxiosRequestConfig & { useCache: boolean }).useCache && !response.headers.cached) {
          const { url, params, method, data } = response.config;
          if (url && method) {
            cacheStore.setCache({
              url,
              method: method.toLowerCase(),
              body: method.toLowerCase() === 'get' ? params : data && JSON.parse(data),
              response: res,
            });
          }
        }
        return res.data;
      case 10000: // 10000假设是未登录状态码
        window.location.href = '/login';
        return res;
      default:
        // 错误显示可在service中控制，因为某些场景我们不想要展示错误
        // 非登录页弹消息
        if (!isLoginPage) {
          // 603 超时报错，提示文案
          if (response.data.status === 1001 && response.data.msg.indexOf('603') > 0) {
            // message.error('当前用户较多，计算资源不足，请稍候再试。');
          } else {
            // message.error((response.data && response.data.msg) || '返回数据格式有误！');
          }
        }

        return Promise.reject((response.data && response.data.msg) || '返回数据格式有误！');
    }
  }
};

service.interceptors.response.use(
  responseHandler,
  error => {
    switch (error.response.status) {
      case 403:
        history.pushState({}, '', '/error/403');
        break;
      case 404:
        history.pushState({}, '', '/error/404');
        break;
      default:
        return Promise.reject(error);
    }
  }
);

export default service;
