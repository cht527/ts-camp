import { AxiosError, AxiosResponse } from "axios";

export type ResponseInfo<T> = {
  /**
   * TODO: 统一 AxiosError 的 T 类型
   * @see https://github.com/hongshancapital/daedalus/blob/master/src/middlewares/errorHandler.ts#L28-L35
   */
  error?: AxiosError<any>;
  response?: AxiosResponse<T>;
  cancelled: boolean;
};

/**
 * TODO: 优化正确的 union type
 */
export type RequestResult<T> = [Optional<T>, ResponseInfo<T>];

export type ResponseList<T> = {
  rowCount: number;
  rows: T[];
};
