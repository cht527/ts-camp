import { EqualFn } from "@/typings/function";
import isArgumentsEqual from "../isArgumentsEqual";

export default function memoizeAsyncFunc<TFunc extends (...args: any[])=> any>(
    fn: TFunc,
    isEqual:EqualFn<TFunc> = isArgumentsEqual,
    { cachePromiseRejection = false } = {}
  ) {
    if (!fn) throw new TypeError('You have to provide a `fn` function.')
  
    let calledOnce = false
    let oldArgs:Parameters<TFunc>;
    let lastResult:ReturnType<TFunc>;
  
    return async (...newArgs: Parameters<TFunc>) => {
      if (calledOnce && isEqual(newArgs, oldArgs)){
        return lastResult;
      } 
  
      lastResult = fn(...newArgs)
  
      if (!cachePromiseRejection && lastResult.catch) {
        lastResult.catch(() => (calledOnce = false))
      }
  
      calledOnce = true
      oldArgs = newArgs
  
      return lastResult
    }
  }


 export const testMemoAsyncFunc =  () => {

    let i = 0;

    const call = async (...args: number[]) =>
      args.reduce((total, current) => total + current) + i
      const memoizedCall = memoizeAsyncFunc(call);

    (async ()=>{
        const firstResponse = await memoizedCall(1, 2, 3);
        console.log(`first: ${firstResponse} = 6`);
  
        // Increment i to equal 20
        i = 20;
        
        // Perform second call, i should equal 0 as it remembers the previous.
        const secondResponse = await memoizedCall(1, 2, 3);
        console.log(`second from memo: ${secondResponse} = 6`);


    })()
  
  
  
 }

  