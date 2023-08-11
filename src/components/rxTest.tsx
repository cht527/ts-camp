import * as React from 'react';
import { fromEvent,merge } from 'rxjs';
import { map,filter, tap } from 'rxjs/operators';
export default function RxTest(){


  const addRef = React.useRef<HTMLElement|null>(null);

  const inputRef = React.useRef<HTMLElement|null>(null);

  const [list,setList] = React.useState<string[]>([]);

  const updateList = (val:string) => {
    setList(prev=>prev.concat([val]))
  }

  React.useEffect(()=>{  
    addRef.current = document.getElementById('btn') as HTMLButtonElement;
    inputRef.current = document.querySelector('.input-val') as HTMLInputElement;

    const inputObservable =  fromEvent<KeyboardEvent>(inputRef.current,'keydown')
    .pipe(
      filter(e=> e.key === 'Enter')
    );

    const addObservable =fromEvent<MouseEvent>(addRef.current, 'click')
   
    const inputMerge = merge(inputObservable,addObservable);

    const app$ = inputMerge.pipe(
      map(()=> (inputRef.current as HTMLInputElement).value),
      filter(value=>value!==''),
      tap(value => {
        updateList(value);
        (inputRef.current as HTMLInputElement).value = ''
      })
    )

    app$.subscribe();
  },[])


  return (
      <div>
            <input type="text" className="input-val" />
            <button id="btn">add</button>
            <ul>
                {
                list.map(item=><li key={item}  >{`task: ${item}`}</li>)
                }
            </ul>
      </div>
  )
}