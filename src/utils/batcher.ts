/* 
实现一个 batcher 函数，使用其对该同步函数包装后，实现每次调用依旧返回预期的二倍结果，
同时还需要保证 executeCount 执行次数为1
*/

let count = 0;

const fn = (nums: number[]) => {
    count++;
    return nums.map(x=>x*2)
}

export const batcher = (f: (...args: any[]) => any): (arr: any[])=>Promise<any> => {
    // ----- 实现 ----------
    let nums: number[] = [];
    let p = Promise.resolve().then(_=>f(nums))

    return arr => {
        let L1 = nums.length;
        nums = nums.concat(arr);
        let L2 = nums.length;
        return p.then(res=>{
            nums = [];
            p = null;
            res.slice(L1,L2)
        })
    }

}

const batcherFn = batcher(fn);

const main = async ()=>{
    const [r1,r2,r3] = await Promise.all([
        batcherFn([1,2,3]),
        batcherFn([4,5]),
        batcherFn([7,8,9])
    ]);
    console.log(count)
    console.log(r1,r2,r3)
}


main()