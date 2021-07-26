import { IsTypeEqual } from "./typeassert";

// 6、 数组API

export type Last<T extends any[]> = T extends [...any, infer R] ? R : never;


export type First<T extends any[]> = T extends [infer R, ...any] ? R : never;

export type Pop<T extends any[]> = T extends [...infer R, infer U] ? R : never;

export type Flatten<T extends any[]> = T extends [] ? [] : T extends [infer First, ...infer Rest] ? [...First extends any[] ? Flatten<First> : [First], ...Flatten<Rest>] : never

