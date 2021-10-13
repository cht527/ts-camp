import { useState } from 'react';
import Modal from '@/components/modal';
import './App.css';


function App() {

  const [show, setShow] = useState(false)


  const handleClick = ()=>{
    setShow(true)
  }
  return (
        <>
            
            <Modal onClose= {()=>setShow(false)} visible={show}  >
              <div>
                content
              </div>
            </Modal>

            <button onClick={handleClick} style={{zIndex: 999}}> clicked </button>

            
        </>
  )

}

export default App;
