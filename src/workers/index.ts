import { expose } from 'comlink';

import { runBigtask } from '@/utils/bigTask';

const worker = {
    runBigtask
}

export type RunbigTaskworker = typeof worker;

expose(worker)