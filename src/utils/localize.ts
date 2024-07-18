import phrase, { ExtractL10nArgs, LocalizationKey } from "../i10n";

declare global {
  interface String {
    localized: <T extends unknown[]>(...args: T) => string;
  }
}

export const localizedByDictionary = <T extends unknown>(
  dictionary: Dictionary<string>,
  target: string,
  args?: T[],
  disableErrorReport?: boolean
) => {
  const value = dictionary[target];

  if (!value) {
    if (!disableErrorReport) {
      const message = `l10n '${target}' is missing`;

      console.warn(message);
    }
    return target;
  }

  return value.replace(/\$(\d+)/g, (_, p1) => String(args?.[p1] ?? ""));
};

// 方案一：扩展，ts 类型检查不够

String.prototype.localized = function <T extends unknown[]>(
  this: string,
  ...args: T
): string {
  return localizedByDictionary(phrase, this, args);
};

// 方案二：

export const localize = <
  Key extends LocalizationKey,
  Localized extends string = (typeof phrase)[Key],
>(
  key: Key,
  ...args: ExtractL10nArgs<Localized>
): string => {
  const value = phrase[key];

  return value.replace(/\$(\d+)/g, (_, p1) => String(args[p1] ?? ''));
};
