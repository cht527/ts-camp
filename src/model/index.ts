import { createStore, StoreApi } from 'zustand/vanilla';
import EventEmitter from 'eventemitter3';

import type { ListenerSignature, DefaultListener } from 'tiny-typed-emitter';
import { Optional, PlainObject } from '@/typings/base';


export type ComputeHandler<T> = () => T;

export type ComputedData<T> = ComputeHandler<T> | [ComputeHandler<T>, Optional<string[]>];

export type ModelParams<T> = {
  data: T;
  // 计算数据（暂不支持）
  computed?: Record<string, ComputedData<T>>;
};

export type ModelClassType<T extends PlainObject, Params = unknown> = {
  new (params: Params): Model<T>;
};

export type EmptyConstructorModelClassType<T extends PlainObject> = {
  new (): Model<T>;
};

/**
 * 业务模型
 */
abstract class Model<
  T extends PlainObject,
  L extends ListenerSignature<L> = DefaultListener,
> extends EventEmitter<L> {
  // 设置数据
  set: StoreApi<T>['setState'];
  // 获取所有数据
  get: StoreApi<T>['getState'];
  // 订阅数据改变
  subscribe: StoreApi<T>['subscribe'];
  destroy: StoreApi<T>['destroy'];
  /** 初始化时调用 */
  onInit?(): void;
  /** 销毁时调用 */
  onDestroy?(): void;

  constructor({ data }: ModelParams<T>) {
    super();

    const { setState, getState, subscribe, destroy } = createStore<T>(() => data);

    this.set = setState;
    this.get = getState;
    this.subscribe = subscribe;
    this.destroy = destroy;
  }
}

export default Model;
