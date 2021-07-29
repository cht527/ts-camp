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


