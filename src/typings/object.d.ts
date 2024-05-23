import { IsTypeEqual } from "./typeassert";

// 获取所有的key
export type AllKeys<T, U> = keyof T | keyof U;
/* _____________ 测试用例 _____________ */
type testAllKeys1 = { x: number; y: string };
type testAllKeys2 = { x: string; y: string; z: boolean };

type Check_AllKeys = AllKeys<testAllKeys1, testAllKeys2>;

// 获取共同的key

export type SharedKeys<T, U> = keyof T & keyof U;
/* _____________ 测试用例 _____________ */
type testSharedKeys1 = { x: number; y: string };
type testSharedKeys2 = { x: string; y: string; z: boolean };

type Check_SharedKeys = SharedKeys<testSharedKeys1, testSharedKeys2>;

//   交集

type DiffKeys<T, U> = Exclude<keyof T, keyof U>;

type Intersect<T extends object, U extends Partial<T>> = Omit<
  U,
  DiffKeys<U, T>
>;
/* _____________ 测试用例 _____________ */

type testIntersect1 = { x: number; y: string };
type testIntersect2 = { y: string; z: string };

type Check_Intersect = IsTypeEqual<
  Intersect<testIntersect1, testIntersect2>,
  { y: string }
>;

//  对象添加kv

type AppendToObject<T extends Record<string, unknown>, U extends string, V> = {
  [K in keyof T | U]: K extends U ? V : T[K];
};

/* _____________ 测试用例 _____________ */

type Obj = {
  a: string;
  b: number;
};

type Check_AppendToObject = IsTypeEqual<
  AppendToObject<Obj, "c", boolean>,
  {
    a: string;
    b: number;
    c: boolean;
  }
>;

// 对象类型
export type ObjectType<T> = {
  [k in keyof T]: T[k];
};

// 合并对象类型 (不能重复key)

export type CombineObjects<T extends object, U extends object> = ObjectType<
  T & U
>;

// Merge （重复key 合并）

type Merge<
  F extends Record<string, unknown>,
  S extends Record<string, unknown>
> = {
  [K in keyof S | keyof F]: K extends keyof F
    ? F[K]
    : K extends keyof S
    ? S[K]
    : never;
};

/* _____________ 测试用例 _____________ */

type ao = {
  a: string;
};

type bo = {
  a: number;
  b: number;
};

type C = ObjectType<ao & bo>;

type t = Merge<ao, bo>;

type Check_merge = IsTypeEqual<Merge<ao, bo>, C>;

// 对象类型 排除 index 类型

type ExcludeIndex<P> = string extends P
  ? never
  : P extends number
  ? never
  : P extends symbol
  ? never
  : P;
type RemoveIndexSignature<T> = {
  [P in keyof T as ExcludeIndex<P>]: T[P];
};

/* _____________ 测试用例 _____________ */

type Foo = {
  [key: string]: any;
  foo(): void;
};

type Check_RemoveIndexSignature = IsTypeEqual<
  RemoveIndexSignature<Foo>,
  {
    foo(): void;
  }
>;

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};
