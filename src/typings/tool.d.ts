
import { IsTypeEqual } from "./typeassert";

export type PromiseType<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

type Awaitt<T> = T extends Promise<infer R> ? R :T

export declare function PromiseAllType<T extends any[]>(values: readonly [...T]): Promise<{
    [P in keyof T] : Awaitt<T[P]>
}>

// 联合类型转交叉类型

// 利用函数逆变特性
type UnionToIntersection<U> = (U extends infer R ? (x:R)=>any : never) extends (x: infer V)=>any ? V : never

/* _____________ 测试用例 _____________ */

type Check_UnionToIntersection1 = IsTypeEqual<UnionToIntersection<'foo'|42|true>,'foo'&42&true>
type Check_UnionToIntersection2 = IsTypeEqual<UnionToIntersection<(() => 'foo') | ((i: 42) => true)>, (() => 'foo') & ((i: 42) => true)>
