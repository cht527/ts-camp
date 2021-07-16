
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


