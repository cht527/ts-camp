import memoFunc from "@/utils/memoFunc";

function add(a:number, b:number) {
  return a + b;
}

function Dashboard() {

  const memoizedAdd = memoFunc(add);
  
  memoizedAdd(1, 2);
  // add function: is called
  // [new value returned: 3]
  
  memoizedAdd(1, 2);
    return (
      <div>
        <h2>Dashboard</h2>
      </div>
    );
  }

export default Dashboard