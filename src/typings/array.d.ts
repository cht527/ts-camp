import { IsTypeEqual } from "./typeassert";

// 6、 数组API

export type Last<T extends any[]> = T extends [...any, infer R] ? R : never;


export type First<T extends any[]> = T extends [infer R, ...any] ? R : never;

export type Pop<T extends any[]> = T extends [...infer R, infer U] ? R : never;

export type Flatten<T extends any[]> = T extends [] ? [] : T extends [infer First, ...infer Rest] ? [...First extends any[] ? Flatten<First> : [First], ...Flatten<Rest>] : never

// 过滤元组数据
export type FilterOut<T extends any[], F> = T extends [infer First, ...infer Rest] ? ([First] extends [F] ? FilterOut<Rest, F> : [First, ...FilterOut<Rest, F>]) : T
/* _____________ 测试用例 _____________ */
type Check_FilterOut = IsTypeEqual<FilterOut<['u',0,null,false], 'u'>, [0,null,false]>


