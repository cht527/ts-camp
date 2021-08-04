
import { IsTypeEqual } from "./typeassert";

export type PromiseType<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

type Awaitt<T> = T extends Promise<infer R> ? R :T

export declare function PromiseAllType<T extends any[]>(values: readonly [...T]): Promise<{
    [P in keyof T] : Awaitt<T[P]>
}>

// union 转 intersection

// 利用函数逆变特性
type UnionToIntersection<U> = (U extends infer R ? (x:R)=>any : never) extends (x: infer V)=>any ? V : never

/* _____________ 测试用例 _____________ */

type Check_UnionToIntersection1 = IsTypeEqual<UnionToIntersection<'foo'|42|true>,'foo'&42&true>
type Check_UnionToIntersection2 = IsTypeEqual<UnionToIntersection<(() => 'foo') | ((i: 42) => true)>, (() => 'foo') & ((i: 42) => true)>


// union 转 Tuple
  // step 1 -- 获取 U的最后一个元素，
  //  type e = (((x: 1) => 0) & ((x: 2) => 0)) extends (x: infer L) => 0 ? L : never;
  //  e = 2 --- 函数重载
type LastInUnion<U> = UnionToIntersection<
  U extends unknown ? (x: U) => 0 : never
> extends (x: infer L) => 0
  ? L
  : never;

type UnionToTuple<U, Last=LastInUnion<U>> = [U] extends [never] ? [] : [...UnionToTuple<Exclude<U,Last>>,Last] 

/* _____________ 测试用例 _____________ */
type Check_UnionToTuple = IsTypeEqual<UnionToTuple<1|2>,[1,2]>

// Tuple 转 object

type Index<T extends readonly string[], K extends T[number], A extends any[]=[]> = T[A['length']] extends K ? A['length'] : Index<T,K,[...A, any]>
type EnumToObj<T extends readonly string[], N extends boolean = false> = {
    readonly [K in T[number] as Capitalize<K>]: N extends false ? K : Index<T,K> 
}

/* _____________ 测试用例 _____________ */
const OperatingSystem = ['macOS', 'Windows', 'Linux'] as const

type Check_Enum1 = IsTypeEqual<EnumToObj<typeof OperatingSystem>, {
    readonly MacOS: 'macOS'
    readonly Windows: 'Windows'
    readonly Linux: 'Linux'
}>

type Check_Enum2 = IsTypeEqual<EnumToObj<typeof OperatingSystem, true>,
  {
    readonly MacOS: 0
    readonly Windows: 1
    readonly Linux: 2
  }>

// union 转 union Tuple

type UnionToUnionTuple<T> = [T] extends [never] ? never : T extends undefined ? never : [T]
/* _____________ 测试用例 _____________ */
type Check_UnionToUnionTuple = IsTypeEqual<UnionToUnionTuple<1|2|null>,[1]|[2]|[null]>
