// 1、 用于联合类型

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


// 2、 用于合并联合类型

export type CombineObjects<T extends object, U extends object> = ObjectType<T & U>;

