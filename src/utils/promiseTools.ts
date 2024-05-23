import { Deferred } from "@/typings/object";
import getFibonaci from "./getFibonaci";
import { Optional } from "@/typings/base";

export const promiseRetry = (
    fn: (...args: any[]) => Promise<any>,
    times = 3
  ) => {
    return new Promise(async (resolve, reject) => {
      while (times--) {
        try {
          const res = await fn();
          resolve(res);
          break;
        } catch (e) {
          if (!times) {
            reject(e);
          }
        }
      }
    });
  };

  
  export type RetryOptions = {
    retries: number;
  };
  
  const DEFAULT_OPTIONS: RetryOptions = {
    retries: 3,
  };
  
  export class RetryPromise {
    private attempts: number = 0;
    private options: RetryOptions = DEFAULT_OPTIONS;
    private lastError: any;
  
    constructor(options?: RetryOptions) {
      if (options) {
        this.options = Object.assign(DEFAULT_OPTIONS, options);
      }
    }
  
    retry<T>(executor: (...args: any[]) => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        if (this.attempts < this.options.retries) {
          setTimeout(() => {
            this.attempts++;
            executor()
              .then((response) => resolve(response))
              .catch((error) => {
                console.log('error', error);
                
                this.lastError = error;
                console.log(`Retry: ${this.attempts} : ${JSON.stringify(error)}`);
                return this.retry(executor).then(resolve).catch(reject);
              });
          }, getFibonaci(this.attempts + 1) * 1000);
        } else {
          reject(this.lastError);
        }
      });
    }
  }



// 顺序执行多个 Promise
export const runPromisesSequentially = async <T>(
  promiseFns: (() => Promise<T>)[],
): Promise<Optional<T>> => {
  const promiseFn = promiseFns.at(0);
  const result = await promiseFn?.();
  const availablePromiseFns = promiseFns.slice(1);

  if (!availablePromiseFns.length) {
    return result;
  }
  return runPromisesSequentially(availablePromiseFns);
};

export const runWaterfallPromises = async <C>(
  promiseFns: ((context: C) => Promise<Optional<C>> | Optional<C>)[],
  context: C,
): Promise<void> => {
  const promiseFn = promiseFns.at(0);

  if (!promiseFn) {
    return;
  }

  const result = await promiseFn(context);

  if (!result) {
    return;
  }

  return runWaterfallPromises(promiseFns.slice(1), result);
};

export const getDeferred = <T>() => {
  const deferred = {} as Deferred<T>;

  deferred.promise = new Promise<T>((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  return deferred;
};

  // ------ 测试 ---------
  const fakeRequest = (payload: { test: number }) =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        const n = Math.random();
        console.log(n);

        if (n < 0.5) {
          reject("failed");
        } else {
          resolve({ success: payload });
        }
      }, 1000)
    );

  const retryFakeRequest = new RetryPromise({ retries: 3 });

  retryFakeRequest
    .retry(() => fakeRequest({ test: 1 }))
    .then(
      (result) => {
        console.log(result);
      },
      (error) => {
        console.log(error);
      }
    );
  
