
import { EqualFn } from "@/typings/function";
import isArgumentsEqual from "../isArgumentsEqual";

export type MemorizeFun<TFunc extends (this: any, ...args:any[]) =>any> = {
    (this: ThisParameterType<TFunc>, ...args:Parameters<TFunc>) : ReturnType<TFunc>
    clear: ()=>void;
}

type Cache<TFunc extends (this:any, ...args:any[])=> any> = {
    lastThis: ThisParameterType<TFunc>,
    lastArgs: Parameters<TFunc>,
    lastResult: ReturnType<TFunc>
}

export default function memoFunc<TFunc extends (this:any, ...newArgs:any)=> any>(fn: TFunc,isEqual: EqualFn<TFunc> = isArgumentsEqual): MemorizeFun<TFunc>{
    let cache: Cache<TFunc> | null = null;

    function memoized(this:ThisParameterType<TFunc>, ...newArgs:Parameters<TFunc>){
        if(cache && cache.lastThis === this && isEqual(cache.lastArgs, newArgs)){
            console.log('second from memo', cache.lastResult);
            
            return cache.lastResult;
        }
        
        const lastResult = fn.apply(this, newArgs);

        cache={
            lastArgs: newArgs,
            lastThis: this,
            lastResult,
        }
        console.log('first', lastResult);

        return lastResult
    }

    memoized.clear = function clear(){
        cache = null
    }

    return memoized
}

export const testMemoFunc = () => {
    function add(a:number, b:number) {
        return a + b;
      }
      
  const memoizedAdd = memoFunc(add);
  memoizedAdd(1, 2);
  memoizedAdd(1, 2)

}