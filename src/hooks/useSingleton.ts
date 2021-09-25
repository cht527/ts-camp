import { useMemo, useRef } from "react";

export default  function useSingleton<T>(creator: ()=>T): T{
    const instance = useRef<T | null>();

    return useMemo(()=>{
        if(instance.current){
            return instance.current 
        }
    
        return instance.current = creator()
    },[])
   
}