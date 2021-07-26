
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


// 合并对象类型

export type ObjectType<T> = {
    [k in keyof T] : T[k]
}

/* _____________ 测试用例 _____________ */

type a = {
    a: string
}

type b = {
    b: number
}

type C = ObjectType<a & b>

export type CombineObjects<T extends object, U extends object> = ObjectType<T & U>;