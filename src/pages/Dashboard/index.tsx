import {testMemoFunc} from "@/utils/memoFunc";
import {testMemoAsyncFunc} from "@/utils/memoFunc/memoAsyncFunc";


function Dashboard() {
    testMemoAsyncFunc();
    testMemoFunc();
    return (
      <div>
        <h2>Dashboard</h2>
      </div>
    );
  }

export default Dashboard