import { Optional } from "@/typings/base";
import { useCallback, useEffect, useRef, useState } from "react";

import { AxiosError, AxiosResponse } from "axios";

export type ResponseInfo<T> = {
  /**
   * TODO: 统一 AxiosError 的 T 类型
   */
  error?: AxiosError<any>;
  response?: AxiosResponse<T>;
  cancelled: boolean;
};

// by design
export type RequestResult<T> = [Optional<T>, ResponseInfo<T>];

const useRequest = <Arguments extends unknown[], R>(
  request: (...args: Arguments) => Promise<RequestResult<R>>,
  delay = 1000
): [
  (...args: Arguments) => Promise<Optional<R>>,
  boolean,
  AxiosError | undefined
] => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError>();

  const destroyedRef = useRef(false);

  const run = useCallback(
    async (...args: Arguments) => {
      let timer: Optional<number>;

      if (delay > 0) {
        timer = window.setTimeout(() => setLoading(true), delay);
      } else {
        setLoading(true);
      }

      const [response, { error, cancelled }] = await request(...args);

      window.clearTimeout(timer);

      if (cancelled || destroyedRef.current) {
        return;
      }

      setLoading(false);

      setError(error);

      if (error) {
        return;
      }

      return response;
    },
    [delay, request]
  );

  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
    };
  }, []);

  return [run, loading, error];
};

export default useRequest;
