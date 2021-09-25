import React ,{useEffect, useRef} from 'react';

export default function useDom(selector:string){
    console.log('--dom --')

    const nodeRef = useRef<HTMLElement|null>(null);
    nodeRef.current = document.querySelector(selector);
    return nodeRef.current
}

enum Fruit{
    Apple,
    Banana,
    Peach
}