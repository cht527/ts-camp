import getFibonaci from "./getFibonaci";

const promiseRetry = (
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
  
  export default promiseRetry;