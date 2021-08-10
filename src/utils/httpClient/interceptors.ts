/**
 * 生成基础axios对象，并对请求和响应做处理
 * 前后端约定接口返回数据结构
 * {
 *    code:0,
 *    data:"成功",
 *    message:""
 * }
 */

import axios from 'axios';

const service = axios.create({
  baseURL: '/', // 本地做了反向代理
  timeout: 10000,
  responseType: 'json',
  withCredentials: true, // 是否允许带cookie这些
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
  },
});

service.interceptors.request.use(
  config => {
    // 若是有做鉴权token , 就给头部带上token
    // 若是需要跨站点,存放到 cookie 会好一点,限制也没那么多,有些浏览环境限制了 localstorage 的使用
    // 这里localStorage一般是请求成功后我们自行写入到本地的,因为你放在vuex刷新就没了
    // 一些必要的数据写入本地,优先从本地读取
    if (localStorage.token) {
      config.headers.Authorization = localStorage.token;
    }
    return config;
  },
  error => Promise.reject(error)
);

service.interceptors.response.use(
  response => {
    const isLoginPage = /login/.test(window.location.pathname);
    if (
      !isLoginPage &&
      typeof response.data === 'string' &&
      response.data.indexOf('<!DOCTYPE') === 0
  ) {
      // 非登录页弹消息
      // message.error('请求出错了！');
      return Promise.reject('');
  }
    const res = response.data;

    switch(res.code) {
      case 0 :
        return res;
      case 10000: // 10000假设是未登录状态码
        window.location.href = '/login';
        return res;
      default :
      // 错误显示可在service中控制，因为某些场景我们不想要展示错误
      // Message.error(res.message);
        return res

    }
  },
  error => {
    switch(error.response.status){
      case 403:
        history.pushState({},'', '/error/403');
        break;
      case 404:
        history.pushState({},'', '/error/404'); 
        break;
      default:
        return Promise.reject(error); 
    }

  }
);


export default service