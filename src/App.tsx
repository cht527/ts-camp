import { createContext, useState } from 'react';
import './App.css';

import PickContextData from '../src/components/testMemo';

export const SomeContext = createContext({
  moneyForDaddy: 0,
  moneyForMe: {value: 1},
});

function App() {
  const [moneyForMe, setmoneyForMe] = useState({value:1});
  const [moneyForDaddy, setmoneyForDaddy] = useState(1);

  const [a] = useState('111111');
  const [b] = useState('222222');



  return (
    <div className="App">
      

      <button onClick={()=>setmoneyForMe({value: moneyForMe.value+1})}>plus a</button>
      <button onClick={()=>setmoneyForDaddy(moneyForDaddy+1)}>plus b</button>

      <SomeContext.Provider value={{moneyForDaddy, moneyForMe}}>
        <PickContextData a={a} b={b} />
      </SomeContext.Provider>
      
    </div>
  );
}

export default App;
