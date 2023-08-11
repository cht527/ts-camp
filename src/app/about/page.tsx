'use client'

import { useState } from 'react';
import { wrap } from 'comlink';
import { runBigtask } from '@/utils/bigTask'
const TIMES = 100000000;
function About() {
    const [data, setData] = useState('');
    return (
      <div>
        <h2>About</h2>
        <div style={{
            backgroundColor: data === 'loading' ? '#7fe7e7' : '#fff'
        }}>
            <button onClick={async ()=>{
                setData('loading');
                const worker = new Worker('../../workers',{name: 'runBigTask', type: 'module'});
                const { runBigtask } = wrap<import('../../workers').RunbigTaskworker>(worker);
                setData(await runBigtask(TIMES))
            }}>
                webWorker
            </button>
            <button onClick={()=>{
                setData('loading');
              
                setData(runBigtask(TIMES))
            }}>
                normal
            </button>
        </div>
        <div>{data}</div>
      </div>
    );
  
}

  export default About