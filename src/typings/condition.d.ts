
/** no-doc */
export type True = '1';
/** no-doc */
export type False = '0';

export type Bool = False | True;

// if
export type If<Cond extends Bool, Then, Else> = Cond extends True ? Then : Else;

// not
export type Not<T extends Bool> = T extends True ? False : True;

// and
export type And<T extends Bool, U extends Bool> = If<T, If<U, True,False>, False>;

export type And2<T extends Bool, U extends Bool> = {
    '0': {
        '0': '0',
        '1': '0'
    },
    '1': {
        '0': '0',
        '1': '1'
    }
}[T][U]

export type test_And2= And2<'1','1'>

// or
export type Or<T extends Bool, U extends Bool> = If<T,True, If<U, True, False>>;


export type Without<T> = { [P in keyof T]?: undefined };

// 异或
export type Xor<A extends Bool, B extends Bool> = Or<And<A, Not<B>>, And<Not<A>, B>>;

// 判断never类型
export type IsNever<T> = [T] extends [never] ? true : false

// 判断联合类型
// 联合类型会执行迭代，
// eg: T = 'A' | 'B' | 'C', => 分别赋值给A,B,C; 
// 通过 B=T，保存原始值， 判断从B中排除 T 是否还有值
export type IsUnion<T, B = T> = T extends T ? (Exclude<B, T> extends [never] ? false : true) : never


