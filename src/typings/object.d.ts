
import { IsTypeEqual } from "./typeassert";

//  对象添加kv

type AppendToObject<T extends Record<string, unknown>, U extends string, V> = {
  [K in keyof T | U] : K extends U ? V : T[K]
}

/* _____________ 测试用例 _____________ */

type Obj = {
  a: string;
  b: number;
}

type Check_AppendToObject= IsTypeEqual<AppendToObject<Obj, 'c', boolean> ,{
  a: string;
  b: number;
  c: boolean
}>


// 对象类型
export type ObjectType<T> = {
    [k in keyof T] : T[k]
}

// 合并对象类型 (不能重复key)

export type CombineObjects<T extends object, U extends object> = ObjectType<T & U>;

// Merge （重复key 合并）

type Merge<F extends Record<string,unknown>, S extends Record<string,unknown>> = {
  [K in keyof S | keyof F]: K extends keyof F ? F[K] : K extends keyof S ? S[K] : never
}

/* _____________ 测试用例 _____________ */

type ao = {
    a: string,
}

type bo = {
    a: number,
    b: number
}

type C = ObjectType<ao & bo>

type t = Merge<ao,bo>

type Check_merge = IsTypeEqual<Merge<ao,bo>, C>

// 对象类型 排除 index 类型

type ExcludeIndex<P> = string extends P ? never : (P extends number ? never : (P extends symbol ? never : P) ) 
type RemoveIndexSignature<T> = {
  [P in keyof T as ExcludeIndex<P>] : T[P]
}

/* _____________ 测试用例 _____________ */

type Foo = {
  [key: string]: any;
  foo(): void;
}

type Check_RemoveIndexSignature = IsTypeEqual<RemoveIndexSignature<Foo>, {
  foo(): void
}>

