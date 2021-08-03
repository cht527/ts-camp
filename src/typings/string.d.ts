import { type } from "node:os";
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

//    3.1 仅仅支持短字符串

//   The usual recursive calculation of the string length is limited by the depth of recursive function calls in TS, that is, it supports strings up to about 45 characters long.
export type TransStringToArray<S extends string> = S extends `${infer Frist}${infer Rest}` ? [Frist,...TransStringToArray<Rest>] : []

export type StrLength1<S extends string> = TransStringToArray<S>['length']

//    3.2 支持长字符串 The type must support strings several hundred characters long 
//  P[P['length]] extends Frist 始终是false，最后一步，空字符 '' 执行 S extends `${infer Frist}${infer Rest}` 为false， 返回 P['length]
export type StrLength2<S extends string, P extends any[] = []> = S extends `${infer Frist}${infer Rest}` ? (
    P[P['length']] extends Frist ? P['length'] : StrLength2<Rest,[...P,any]>
) : P['length']

/* _____________ 测试用例 _____________ */

type Check_StrLength1 = IsTypeEqual<StrLength1<'aaa'>,3>

type Check_StrLength2 = IsTypeEqual<StrLength2<'aaa'>,3>



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


// 6、 字符串 转 数字

type StringToNumber<S extends string, T extends any[] = []> =  S extends `${T['length']}` ? T['length'] : StringToNumber<S,[...T, any]>

/* _____________ 测试用例 _____________ */

type Check_StringToNumber= IsTypeEqual<StringToNumber<'112'>, 112>



