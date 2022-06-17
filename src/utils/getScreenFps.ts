
export const getScreenFps =  (targetCount = 50)=>{
        if(targetCount < 1){
            throw new Error('targetCount cannot be less than 1')
        }

        const start = Date.now();

        let count = 0;

        return new Promise((resolve)=>{
            const run = ()=>{
                if(++count >= targetCount){
                    const delta = Date.now() - start;
                    const fps = (count / delta) * 1000;
                    return resolve(fps)
                }
                window.requestAnimationFrame(run)
            }
            window.requestAnimationFrame(run)
           
        })
    }

getScreenFps().then((fps)=> console.log(fps))