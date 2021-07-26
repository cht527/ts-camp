
export type PromiseType<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

type Awaitt<T> = T extends Promise<infer R> ? R :T

export declare function PromiseAllType<T extends any[]>(values: readonly [...T]): Promise<{
    [P in keyof T] : Awaitt<T[P]>
}>


