import common from "./common";

const phrase = {
  ...common,
};

export type LocalizationKey = keyof typeof phrase;

type L10nArgType = string | number | null;

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type SplitReplacerStr<T extends string> =
  T extends `${infer Left}$${infer Index}${infer Right}`
    ? Index extends Digit
      ? [Left, Right]
      : // Index 非数字
        SplitReplacerStr<`_${Index}${Right}`>
    : [];

export type ExtractL10nArgs<
  T extends string,
  Result extends L10nArgType[] = []
> = SplitReplacerStr<T> extends [
  infer Left extends string,
  infer Right extends string
]
  ? Right extends ""
    ? // replacer 在结尾则选填
      [...Result, L10nArgType?]
    : Left extends ""
    ? // replacer 在开头需要判断 Right 是否没有其他 replacer
      SplitReplacerStr<Right>["length"] extends 0
      ? // Right 无其他 replacer则选填
        [...Result, L10nArgType?]
      : // Right 有其他 replacer，当前 replacer 必填
        ExtractL10nArgs<Right, [...Result, L10nArgType]>
    : // replacer 在中间则必填
      ExtractL10nArgs<Right, [...Result, L10nArgType]>
  : // 无 replacer
    Result;


export default phrase;
