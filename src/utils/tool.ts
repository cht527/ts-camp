import { Optional, Truthy } from "@/typings/base";

function hasObjectPrototype(o: any): boolean {
  return Object.prototype.toString.call(o) === "[object Object]";
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
function isPlainObject(o: any) {
  if (!hasObjectPrototype(o)) {
    return false;
  }

  // If has modified constructor
  const ctor = o.constructor;
  if (typeof ctor === "undefined") {
    return true;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }

  // If constructor does not have an Object-specific method
  if (!Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf")) {
    return false;
  }

  // Most likely a plain Object
  return true;
}
/**
 * This function returns `a` if `b` is deeply equal.
 * If not, it will replace any deeply equal children of `b` with those of `a`.
 * This can be used for structural sharing between JSON values for example.
 */
export function replaceEqualDeep<T>(a: unknown, b: T): T;
export function replaceEqualDeep(a: any, b: any): any {
  if (a === b) {
    return a;
  }

  const array = Array.isArray(a) && Array.isArray(b);

  if (array || (isPlainObject(a) && isPlainObject(b))) {
    const aSize = array ? a.length : Object.keys(a).length;
    const bItems = array ? b : Object.keys(b);
    const bSize = bItems.length;
    const copy: any = array ? [] : {};

    let equalItems = 0;

    for (let i = 0; i < bSize; i++) {
      const key = array ? i : bItems[i];
      copy[key] = replaceEqualDeep(a[key], b[key]);
      if (copy[key] === a[key]) {
        equalItems++;
      }
    }

    return aSize === bSize && equalItems === aSize ? a : copy;
  }

  return b;
}

// copied from: https://github.com/tannerlinsley/react-query/blob/master/src/core/utils.ts
export function deepEqual(a: any, b: any): boolean {
  return replaceEqualDeep(a, b) === a;
}

/**
 * 支持格式化输出 Error 等复杂对象，避免直接序列化获得 '{}'
 * @param error
 */
export const stringifyError = (
  error?: Error | ProgressEvent | DOMException | null
) => {
  if (!error) {
    return "undefined";
  }

  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error));
  } catch {
    return "parse error fail";
  }
};

export const notFalsy = <T>(value: T): value is Truthy<T> => !!value;
export const conditional = <T>(exp: T): Optional<Truthy<T>> =>
  notFalsy(exp) ? exp : undefined;

export const transStringToEnum = <Item>(
  value: string,
  enumObj: Record<string, Item>
): Item | undefined => {
  return Object.values(enumObj).find((v) => String(v) === value);
};
