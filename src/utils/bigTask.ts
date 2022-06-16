
const bigTask= (int: number) => {
    const sum = new Array(int).fill(0).map((el, i)=> el + i).reduce((sum,el)=> sum+el,0);
    console.log(sum);
}

export const runBigtask = (int: number) => {
    bigTask(int);
    return 'done'
}