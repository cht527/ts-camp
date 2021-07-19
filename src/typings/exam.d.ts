// 1、LookUp

import { IsTypeEqual } from "./typeassert";

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

// 2、 Chainable

type Chainable<T = {}> = {
  option: <K extends string, V>(key: K, value: V) => Chainable<T & {[P in K]: V}>,
  get(): T
}


/* _____________ 测试用例 _____________ */

declare const a: Chainable

const result = a
  .option('foo', 123)
  .option('bar', { value: 'Hello World' })
  .option('name', 'type-challenges')
  .get()

type Expected = {
  foo: number
  bar: {
    value: string
  }
  name: string
}


type Check_Chainable = IsTypeEqual<typeof result, Expected>