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

// 3、 Trim相关

// 3.1 TrimLeft
type WhiteSpace = ' ' | '\t' | '\n';
type TrimLeft<S extends string> = S extends `${WhiteSpace}${infer V}` ? TrimLeft<V> : S;


// 3.2 Trim
type Trim<S extends string> =  S extends `${WhiteSpace}${infer Right}` ?  Trim<Right> : (S extends `${infer Left}${WhiteSpace}` ? Trim<Left> : S)

/* _____________ 测试用例 _____________ */
type Check_TrimLeft = IsTypeEqua
l<TrimLeft<'   \n\t foo bar '>, 'foo bar '>

type Check_Trim = IsTypeEqual<Trim<'   \n\t foo bar \t'>, 'foo bar'>

// 4、 Replace, ReplaceAll

type Replace<S extends string, From extends string, To extends string> = From extends '' ? S : (S extends '' ? To : S extends `${infer Front}${From}${infer End}` ? `${Front}${To}${End}` : S)

type ReplaceAll<S extends string, From extends string, To extends string> = From extends '' ? (S extends '' ? To : S) : S extends `${infer Front}${From}${infer End}` ? `${Front}${To}${ReplaceAll<End,From,To>}` : S


/* _____________ 测试用例 _____________ */

type Check_Replace = IsTypeEqual<Replace<'foo bar', 'foo', 't'>, 't bar'>

type Check_ReplaceAll = IsTypeEqual<Replace<'foo bar foo', 'foo', 't'>, 't bar'>

// 5、 AppendArgument 追加参数

type AppendArgument<Fn, A> = Fn extends (...arg: infer U) => infer V ? (...arg: [...U,A])=> V :Fn

/* _____________ 测试用例 _____________ */

type FnInput= （a:number，b:string）=> number
type FnOutput = (a:number, b:string, c:boolean) => number
type Check_AppendArgument = IsTypeEqual<AppendArgument<FnInput, boolean>, FnOutput>

// 6、 数组API

export type Last<T extends any[]> = T extends [...any, infer R] ? R : never;

export type First<T extends any[]> = T extends [infer R, ...any] ? R : never;

export type Pop<T extends any[]> = T extends [...infer R, infer U] ? R : never;

export type Flatten<T extends any[]> = T extends [] ? [] : T extends [infer First, ...infer Rest] ? [...First extends any[] ? Flatten<First> : [First], ...Flatten<Rest>] : never


// 7、 字符串长度

export type TransStringToArray<S extends string> = S extends `${infer Frist}${infer Rest}` ? [Frist,...TransStringToArray<Rest>] : []

export type StrLength<S extends string> = TransStringToArray<S>['length']

/* _____________ 测试用例 _____________ */

type Check_StrLength = StrLength<'aaa'>