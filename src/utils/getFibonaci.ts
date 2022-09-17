const getFibonaci = (num: number) => {
    
    const memo = [1, 1];
    const fibnacci = (n: number): number => {
      if (!memo[n - 1]) {
  
        memo[n - 1] = fibnacci(n - 1) + fibnacci(n - 2);
      }
  
      return memo[n - 1];
    };
  
    return fibnacci(num);
  };
  

export default getFibonaci;