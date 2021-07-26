import { IsTypeEqual } from "./typeassert";

// LookUp

type LookUp<U, T> = U extends Record<'type', T> ? U : never; // U extends {type: T} ? U : never

/* _____________ 测试用例 _____________ */

type Animal = Cat | Dog

interface Cat {
  type: 'cat'
  breeds: 'Abyssinian' | 'Shorthair' | 'Curl' | 'Bengal'
}

interface Dog {
  type: 'dog'
  breeds: 'Hound' | 'Brittany' | 'Bulldog' | 'Boxer'
  color: 'brown' | 'white' | 'black'
}

type D = LookUp<Animal, 'cat'>;

type Check_LookUp = IsTypeEqual<D, Cat>
// -----------------------------------------------

// diff

export type Diff<U extends Record<string, unknown>, F extends Record<string, unknown>> = {
  [P in Exclude<keyof U, keyof F> | Exclude<keyof F,keyof U>] : P extends keyof U ? U[P] : F[P] 
}

/* _____________ 测试用例 _____________ */

type diff1 = {
  a: string,
  b: boolean
}

type diff2 = {
  a: boolean,
  c: boolean
}

type diff = Diff<diff1, diff2>

type Check_Diff = IsTypeEqual<Diff<diff1, diff2>, {b: boolean, c:boolean}>


// anyof 

type Falsy = 0 | '' | false | [] | {[P in any]: never}

type AnyOf<T extends readonly any[]> = T extends [] ? false : T extends [infer Frist, ...infer Rest] ? Frist extends Falsy ? AnyOf<Rest> : true : false

/* _____________ 测试用例 _____________ */


type Check_AnyOf = IsTypeEqual<AnyOf<[1, 'test', true, [1], {name: 'test'}, {1: 'test'}]>, true>