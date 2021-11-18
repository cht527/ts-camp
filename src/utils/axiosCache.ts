import { deepEqual } from './tool';

interface ICacheConfig {
    maxAge?: number; // 多少秒过期
}

interface ICacheItem {
    date: number;
    response: any;
    cacheKey: string; // 缓存的唯一key
    method: string; // 请求的方法
    url: string; // 请求的url
    body: any; // 请求体
}

const defaultConfig: ICacheConfig = { maxAge: undefined };

export default class CacheStore {
    config: ICacheConfig = defaultConfig;
    private caches: ICacheItem[] = [];

    constructor(config: ICacheConfig = defaultConfig) {
        this.config = config;
    }

    // 设置缓存元素，
    setCache(params: Omit<ICacheItem, 'date' | 'cacheKey'>) {
        // 先刷新时间
        this.refresh();

        const paramsKeyMap = {
            method: params.method,
            url: params.url,
            body: params.body
        };

        const hasCachedIdx = this.caches.findIndex(item =>
            deepEqual(paramsKeyMap, {
                method: item.method,
                url: item.url,
                body: item.body
            })
        );

        if (hasCachedIdx > -1) {
            const { cacheKey } = this.caches[hasCachedIdx];
            this.replaceItem(cacheKey, params.response);
            return this.caches[hasCachedIdx];
        } else {
            const cacheKey = this.getCacheKey(paramsKeyMap);
            return this.addItem({ ...paramsKeyMap, cacheKey }, params.response);
        }
    }

    // 获取缓存值
    getCache(params: Omit<ICacheItem, 'date' | 'cacheKey' | 'response'>) {
        this.refresh();

        const hasCachedIdx = this.caches.findIndex(item =>
            deepEqual(params, {
                method: item.method,
                url: item.url,
                body: item.body
            })
        );
        if (hasCachedIdx > -1) {
            return this.caches[hasCachedIdx];
        } else {
            return null;
        }
    }

    // 添加元素
    private addItem(item: Omit<ICacheItem, 'date' | 'response'>, response: any) {
        const data = {
            ...item,
            date: Date.now(),
            response
        };
        this.caches.push(data);
        return data;
    }

    // 替换元素
    private replaceItem(cacheKey: string, response: any) {
        this.caches = this.caches.map(item =>
            (item.cacheKey === cacheKey ? { ...item, response, date: Date.now() } : item)
        );
    }

    // 按过期时间刷新
    private refresh() {
        if (this.config.maxAge) {
            this.caches = this.caches.filter(item =>
                (this.config.maxAge ? Date.now() - item.date < this.config.maxAge : true)
            );
        }
    }

    // 获取缓存key
    private getCacheKey(params: Omit<ICacheItem, 'date' | 'cacheKey' | 'response'>) {
        return JSON.stringify(params);
    }
}
