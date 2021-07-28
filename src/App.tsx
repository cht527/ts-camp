import { createContext } from 'react';
import VideoCloud from '../src/components/videoCloud';
import {data} from  './components/videoCloud/data';
import './App.css';

// import PickContextData from '../src/components/testMemo';
import { GradeListItem } from './components/videoCloud/video_cloud';

export const SomeContext = createContext({
  moneyForDaddy: 0,
  moneyForMe: {value: 1},
});


export enum State {
  PREVIEW = -1,
  CREATED = 0,
  RUNNING = 3,
  FINISHED = 2,
  CANCELED = 4,
  FAILED = 1
}

function App() {
  // const [moneyForMe, setmoneyForMe] = useState({value:1});
  // const [moneyForDaddy, setmoneyForDaddy] = useState(1);

  // const [a] = useState('111111');
  // const [b] = useState('222222');

  const data_ :GradeListItem[] = data;

  return (
    <div className="App">
      
      <VideoCloud gradeList={data_} materialType={3} indexType={1}  />
      
    </div>
  );
}

export default App;
