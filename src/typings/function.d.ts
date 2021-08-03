
import { IsTypeEqual } from "./typeassert";

// 链式操作 Chainable

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


//  AppendArgument 追加参数

type AppendArgument<Fn, A> = Fn extends (...arg: infer U) => infer V ? (...arg: [...U,A])=> V :Fn

/* _____________ 测试用例 _____________ */

type FnInput= (a:number,b:string)=> number
type FnOutput = (a:number, b:string, c:boolean) => number
type Check_AppendArgument = IsTypeEqual<AppendArgument<FnInput, boolean>, FnOutput>

// Getter 

type Get<T,K>  = T extends `${infer F}.${infer L}` ? (F extends keyof T ? Get<T[F],L> : never) : (K extends keyof T ? T[K]: never)

/* _____________ 测试用例 _____________ */

type Data = {
  foo: {
    bar: {
      value: 'foobar',
      count: 6,
    },
    included: true,
  },
  hello: 'world'
}

type Check_Get1 = IsTypeEqual<Get<Data, 'hello'>, 'world'>

type Check_Get2 = IsTypeEqual<Get<Data, 'foo.bar.count'>, 6>

type Check_Get3 = IsTypeEqual<Get<Data, 'no.existed'>, never>

