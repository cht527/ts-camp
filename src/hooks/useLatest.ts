import { useRef, useLayoutEffect } from "react";

/**
 * 返回最新值的 ref，避免 hook 闭包问题
 * @param value 值
 */
const useLatest = <T>(value: T) => {
  const ref = useRef(value);

  // 解决 devtools 打开时，可能不更新 ref 的问题 https://github.com/facebook/react/issues/20394
  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
};

export default useLatest;
