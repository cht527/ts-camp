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
  
  export default promiseRetry;