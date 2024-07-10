'use client'

import {testMemoFunc} from "@/utils/memoFunc";
import {testMemoAsyncFunc} from "@/utils/memoFunc/memoAsyncFunc";


function Dashboard() {
    testMemoAsyncFunc();
    testMemoFunc();
    return (
      <div>
        <h2>Dashboard</h2>
        <iframe src="/iframeSync.html" frameBorder="0"></iframe>
      </div>
    );
  }

export default Dashboard