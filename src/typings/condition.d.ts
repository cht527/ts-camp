
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

// or
export type Or<T extends Bool, U extends Bool> = If<T,True, If<U, True, False>>;


export type Without<T> = { [P in keyof T]?: undefined };

// 异或
export type Xor<A extends Bool, B extends Bool> = Or<And<A, Not<B>>, And<Not<A>, B>>;

