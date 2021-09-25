
let memoizedState: any[] = [] // hooks 的值存放在这个数组里
let cursor = 0 // 当前 memoizedState 的索引
export default function useMyState<T>(initValue:T):[T,(value: T) => void]{
    memoizedState[cursor] = memoizedState[cursor] || initValue;
    const currentCursor = cursor
    function dispatch(newValue:T){
        memoizedState[currentCursor]=newValue; 
        // render       
    }

    return [memoizedState[cursor++],dispatch]
}


type Reducer<S, A> = (prevState: S, action: A) => S;
type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;

type Dispatch<A> = (value: A) => void;


// export function useMyReducer<R extends Reducer<any, any>,I>(reducer:R,initialArg:I & ReducerState<R>,init:(arg: I & ReducerState<R>) => ReducerState<R>):[ReducerState<R>, Dispatch<ReducerAction<R>>]{
//     let initState;

//     if(typeof init === 'function'){
//         initState = init(initialArg)
//     } else {
//         initState = initialArg
//     }

//     function dispatch(action:ReducerAction<R>){
//         memoizedState = reducer(memoizedState, action)
//         // render
//     }

//     memoizedState = memoizedState || initState

//     return [memoizedState, dispatch]
// }


