import { useEffect, useReducer, useRef, useState } from "react";

import type Model from ".";
import type { EmptyConstructorModelClassType, ModelClassType } from ".";
import { PlainObject } from "@/typings/base";
import useLatest from "@/hooks/useLatest";
import { shallow } from "zustand/shallow";

export function useCreateModel<C extends EmptyConstructorModelClassType<any>>(
  ModelClass: C
): InstanceType<C>;

export function useCreateModel<C extends ModelClassType<any, any>>(
  ModelClass: C,
  params: ConstructorParameters<C>[0]
): InstanceType<C>;

/**
 * 在视图中创建 Model（对同一个 Model 类，每个组件只会创建一个 Model 对象）
 * @param ModelClass Model 类
 * @param params 数据参数 {data: 初始数据, onConstruct: 初始化回调, onDestroy: 销毁回调}
 * @returns Model 对象
 */
export function useCreateModel<
  C extends ModelClassType<any, any>,
  Params extends ConstructorParameters<C>[0]
>(ModelClass: C, params?: Params): InstanceType<C> {
  const [modelInstance] = useState(
    () => new ModelClass(params as Params) as InstanceType<C>
  );

  useEffect(() => {
    modelInstance.onInit?.();
    return () => {
      modelInstance.onDestroy?.();
      // 解绑监听的事件
      modelInstance.destroy();
    };
  }, [modelInstance]);

  return modelInstance;
}

type SelectorKey<T extends PlainObject> = keyof T;
type SelectorFn<
  in T extends PlainObject,
  out U extends PlainObject = PlainObject
> = (state: T) => U;
type SelectorType<T extends PlainObject> = SelectorKey<T> | SelectorFn<T>;

/**
 * `SelectorKey<T>` 限制 selector 为 keyof T。
 * 这里判断 `S extends keyof any` 保证 generic model 可以正常推导出 pick 的 key。
 * 如是 `S extends keyof T`，generic model T 会推导为 `keyof T & "key" => never`
 */
type ParseSelectorType<
  T extends PlainObject,
  S extends SelectorType<T>
> = S extends keyof any
  ? {
      [K in S]: T[K];
    }
  : S extends SelectorFn<T, infer R>
  ? R
  : {};

type SelectorState<
  T extends PlainObject,
  Selectors extends SelectorType<T>[]
> = Selectors extends [
  infer S extends SelectorType<T>,
  // Rest 是 tuple，使用 any 延迟计算
  ...infer Rest extends any[]
]
  ? ParseSelectorType<T, S> & SelectorState<T, Rest>
  : {};

// https://github.com/pmndrs/zustand/blob/v3.7.2/src/react.ts
const getStateSlice = <
  T extends PlainObject,
  Selectors extends SelectorType<T>[]
>(
  state: T,
  selectors: Selectors
) =>
  // 内部实现使用宽松的 PlainObject 类型
  selectors.reduce<PlainObject>((acc, param) => {
    if (typeof param === "function") {
      Object.assign(acc, param(state));
    } else {
      // eslint-disable-next-line no-param-reassign
      acc[param] = state[param];
    }

    return acc;
  }, {}) as SelectorState<T, Selectors>;

/**
 * 使用 Model 数据（数据变化时，会触发重新渲染）
 * @param model Model 对象
 * @param selectors state 选择器，支持 key 或者 selector 函数
 * @returns 数据值
 */
export const useModelState = <
  T extends PlainObject,
  Selectors extends SelectorType<T>[]
>(
  model: Model<T>,
  ...selectors: Selectors
): SelectorState<T, Selectors> => {
  const [, forceUpdate] = useReducer((c) => c + 1, 0);
  const state = model.get();
  const [stateSlice, setStateSlice] = useState(() =>
    getStateSlice(state, selectors)
  );
  const currentSliceRef = useRef(stateSlice);
  const stateBeforeSubscriptionRef = useRef(state);
  const selectorsRef = useLatest(selectors);

  useEffect(() => {
    // 处理状态变化
    const listener = () => {
      try {
        const nextState = model.get();
        const nextStateSlice = getStateSlice(nextState, selectorsRef.current);

        // 只订阅部分数据的变化
        if (!shallow(currentSliceRef.current, nextStateSlice)) {
          currentSliceRef.current = nextStateSlice;
          setStateSlice(nextStateSlice);
        }
      } catch (error) {
        forceUpdate();
      }
    };
    const unsubscribe = model.subscribe(listener);

    // subscribe 之前，如果状态有变化，也要触发重新渲染
    if (model.get() !== stateBeforeSubscriptionRef.current) {
      listener();
    }
    return unsubscribe;
  }, [model, selectorsRef]);

  return stateSlice;
};
