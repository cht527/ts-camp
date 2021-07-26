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




