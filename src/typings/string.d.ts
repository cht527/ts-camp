import { IsTypeEqual } from "./typeassert";


// 1、 Trim相关

// TrimLeft
type WhiteSpace = ' ' | '\t' | '\n';
type TrimLeft<S extends string> = S extends `${WhiteSpace}${infer V}` ? TrimLeft<V> : S;

// Trim
type Trim<S extends string> =  S extends `${WhiteSpace}${infer Right}` ?  Trim<Right> : (S extends `${infer Left}${WhiteSpace}` ? Trim<Left> : S)

/* _____________ 测试用例 _____________ */
type Check_TrimLeft = IsTypeEqual<TrimLeft<'   \n\t foo bar '>, 'foo bar '>

type Check_Trim = IsTypeEqual<Trim<'   \n\t foo bar \t'>, 'foo bar'>

// 2、 Replace, ReplaceAll

type Replace<S extends string, From extends string, To extends string> = From extends '' ? S : (S extends '' ? To : S extends `${infer Front}${From}${infer End}` ? `${Front}${To}${End}` : S)

type ReplaceAll<S extends string, From extends string, To extends string> = From extends '' ? (S extends '' ? To : S) : S extends `${infer Front}${From}${infer End}` ? `${Front}${To}${ReplaceAll<End,From,To>}` : S


/* _____________ 测试用例 _____________ */

type Check_Replace = IsTypeEqual<Replace<'foo bar', 'foo', 't'>, 't bar'>

type Check_ReplaceAll = IsTypeEqual<Replace<'foo bar foo', 'foo', 't'>, 't bar'>

// 3、字符串长度

export type TransStringToArray<S extends string> = S extends `${infer Frist}${infer Rest}` ? [Frist,...TransStringToArray<Rest>] : []

export type StrLength<S extends string> = TransStringToArray<S>['length']

/* _____________ 测试用例 _____________ */

type Check_StrLength = IsTypeEqual<StrLength<'aaa'>,3>


// 4、字符串转联合类型

type StringToUnion<T extends string> =  T extends '' ? never : T extends `${infer First}${infer Rest}` ? First | StringToUnion<Rest> : never
/* _____________ 测试用例 _____________ */

type Check_StringToUnion_case = [
    IsTypeEqual<StringToUnion<'aaa'>,'a'|'a'|'a'>,
    IsTypeEqual<StringToUnion<''>,never>,
]

// 5 、 命名规范 ，

//  烤肉串->驼峰

type CamelCase<S extends string> = S extends `${infer Head}-${infer Rest}` ? `${Head}${Capitalize<CamelCase<Rest>>}` : Capitalize<S> 

//  驼峰->烤肉串

type Uncapitalize<S> = S extends `${infer F}${infer E}` ? `${Lowercase<F>}${E}` : S

type KebabCase<S extends string> = S extends `${infer Head}${infer Rest}` 
                                    ? `${Uncapitalize<Head>}${Rest extends Uncapitalize<Rest> ? '' : '-'}${KebabCase<Rest>}` 
                                    : Uncapitalize<S>

/* _____________ 测试用例 _____________ */

type Check_CamelCase= IsTypeEqual<CamelCase<'foo-bar-baz'>, 'fooBarBaz'>

type Check_KebabCase= IsTypeEqual<KebabCase<'fooBarBaz'>, 'foo-bar-baz'>

