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