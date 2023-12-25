import { IsTypeEqual } from "./typeassert";

export interface MapKV<T> {
    [key: string]: T | MapKV<T>;
}

// PowerPartial -- 多层
export type PowerPartial<T> = {
    // 如果是 object，则递归类型
   [U in keyof T]?: T[U] extends object
     ? PowerPartial<T[U]>
     : T[U]
};

export declare type UnionOmit<T, K> = T & Omit<K, keyof T>;

// 基于值类型的Pick

export type PickByValue<T, ValueType> = Pick<T, {[key in keyof T]-? : T[key] extends ValueType ? key : never }[keyof T]>
/* _____________ 测试用例 _____________ */

type test_PickByValue = { req: number; reqUndef: number | undefined; opt?: string; };

type check_PickByValue1 = IsTypeEqual<PickByValue<test_PickByValue, number>, {req: number}>

type check_PickByValue2 = IsTypeEqual<PickByValue<test_PickByValue, number|undefined>, {req: number, reqUndef: number | undefined;}>


// 把给定的key 转化成 requierd 类型

export type AugmentedRequired<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Required<Pick<T,K>>
/* _____________ 测试用例 _____________ */
 type test_augmentedRequired1 = {
    name?: string;
    age?: number;
    visible?: boolean;
 };

 type Check_AugmentedRequired1 = IsTypeEqual<AugmentedRequired<test_augmentedRequired1>,Required<test_augmentedRequired1>>

 type test_augmentedRequired2 = { name: string; age?: number; visible?: boolean; }

 type Check_AugmentedRequired2 = IsTypeEqual<AugmentedRequired<test_augmentedRequired2, 'age' | 'visible'>,{ name: string; age: number; visible: boolean; }>;


// 提取必选项
export type GetRequired<T> = {
    [P in keyof T as (T[P] extends Required<T>[P] ? P : never)] : T[P]
}

/* _____________ 测试用例 _____________ */
type test_GetRequired = {
    a: string,
    b?: string
}
type Check_GetRequired = IsTypeEqual<GetRequired<test_GetRequired>,{a: string}>



// 提取可选项
export type GetOptional<T> = {
    [P in keyof T as (T[P] extends Required<T>[P] ? never : P)] : T[P]
}

/* _____________ 测试用例 _____________ */
type test_GetOptional = {
    a: string,
    b?: string
}
type Check_GetOptional = IsTypeEqual<GetOptional<test_GetOptional>,{b?: string}>


type Optional<T> = T | undefined;
