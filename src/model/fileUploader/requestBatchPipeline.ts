import { Optional } from '@/typings/tool';
import { RequestResult, ResponseList } from '@/typings/xhr';
import uniq from 'lodash-es/uniq';


type MultiParam<T> = T[];

type SingleOrMultiParam<T> = T | MultiParam<T>;

type MultiParamRequestFn<T, R> = (params: MultiParam<T>) => Promise<RequestResult<ResponseList<R>>>;

type SingleOrMultiParamRequestFn<T, R> = (
  params: SingleOrMultiParam<T>,
) => Promise<RequestResult<ResponseList<R>>>;

type RequestFn<T, R> = MultiParamRequestFn<T, R> | SingleOrMultiParamRequestFn<T, R>;

type BatchParams<T> = T[];

type PickResultFn<T, R> = (batchResponse: R, params: T[]) => boolean;

type BatchPipelineConfig<T, R, K extends keyof R | PickResultFn<T, R>> = {
  // 截流间隔
  throttle?: number;
  // 最大批量请求参数数量
  maxBatchParamsSize?: number;
  // 请求参数是否去重
  omitDuplicatesRequest?: boolean;
  // 用于发送批量请求的函数 由于会合并多个请求，所以这个请求必须支持批量处理(简单来说就是参数得支持数组)
  requestFn: RequestFn<T, R>;
  pickResult: K;
};

type DelayedRequestStruct<T, R> = {
  ids: T[];
  resolve: (results: Optional<R>[]) => void;
  reject: (reason?: unknown) => void;
};

const toArray = <T>(ids: SingleOrMultiParam<T>): BatchParams<T> =>
  Array.isArray(ids) ? ids : [ids];

const nextTickExecute = (fn: Function) => Promise.resolve().then(() => fn());

type GetType<R, T, K extends keyof R | PickResultFn<T, R>> = K extends keyof R ? R[K] : unknown;

const DEFAULT_CONFIG = {
  throttle: 50,
  omitDuplicatesRequest: true,
};

export class RequestBatchPipeline<
  R,
  K extends keyof R | PickResultFn<T, R>,
  T extends GetType<R, T, K>,
> {
  private called = false;
  private requestQueue: DelayedRequestStruct<T, R>[] = [];
  private config: BatchPipelineConfig<T, R, K>;
  private sendingRequests: DelayedRequestStruct<T, R>[][] = [];

  constructor(config: BatchPipelineConfig<T, R, K>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  sendRequest = (params: SingleOrMultiParam<T>): Promise<Optional<R>[]> => {
    const ids = toArray(params);
    const promise = this.buildWaitForHandleRequest(ids);

    nextTickExecute(this.handleRequestQueue);

    return promise;
  };

  private buildWaitForHandleRequest = (ids: T[]): Promise<Optional<R>[]> =>
    new Promise((resolve, reject) => {
      this.requestQueue = this.requestQueue.concat({
        ids,
        resolve,
        reject,
      });
    });

  /*
   * 这是为了省略可以被已经发送的批量请求包含的另一个批量发送的请求
   * 比如批量上传文件的时候，会合并出一个 fetch?ids=1,2,3,4,5 的请求 同时后续假设又有一个 ids = 1,2,3 这样的请求
   * 那么其实 1,2,3 这个请求就可以被 fetch?ids=1,2,3,4,5 这个请求包含了
   */
  private isSubsetOfRequests = (
    requests: DelayedRequestStruct<T, R>[],
    anotherRequests: DelayedRequestStruct<T, R>[],
  ) => {
    const ids = uniq(requests.flatMap((item) => item.ids));
    const anotherIds = uniq(anotherRequests.flatMap((item) => item.ids));

    return ids.every((id) => anotherIds.includes(id));
  };

  private throttleBatchSend = (requests: DelayedRequestStruct<T, R>[]) => {
    if (this.called || requests.length === 0) {
      return;
    }
    this.requestQueue = this.requestQueue.slice(requests.length);

    const { requestFn, throttle, omitDuplicatesRequest } = this.config;

    // 看 this.isSubsetOfRequests 的注释
    const isRequestOmissible =
      omitDuplicatesRequest &&
      this.sendingRequests.some((sendingRequests) =>
        this.isSubsetOfRequests(requests, sendingRequests),
      );

    if (omitDuplicatesRequest) {
      // eslint-disable-next-line no-restricted-syntax
      this.sendingRequests.push(requests);
    }

    if (isRequestOmissible) {
      return;
    }

    this.called = true;

    setTimeout(() => {
      this.called = false;
      this.loopSendIfRequestQueueNotEmpty();
    }, throttle);

    const ids = uniq(requests.flatMap((item) => item.ids)); // 默认去重, 批量请求的接口重复的参数没啥意义目前

    requestFn(ids)
      .then((results) => this.onBatchRequestSuccess(results, requests))
      .catch((results) => this.onBatchRequestError(results, requests));
  };

  private loopSendIfRequestQueueNotEmpty = () => {
    if (!this.requestQueue.length) {
      return;
    }

    this.handleRequestQueue();
  };

  private handleRequestQueue = () => {
    const { maxBatchParamsSize } = this.config;

    const requests = maxBatchParamsSize ? [] : this.requestQueue;

    if (maxBatchParamsSize) {
      this.requestQueue.reduce((acc, item) => {
        const { ids } = item;
        const nextAcc = acc + ids.length;

        if (nextAcc <= maxBatchParamsSize) {
          // eslint-disable-next-line no-restricted-syntax
          requests.push(item);

          return nextAcc;
        }

        return acc;
      }, 0);
    }

    this.throttleBatchSend(requests);
  };

  private removeSendingRequest = (requests: DelayedRequestStruct<T, R>[]) => {
    this.sendingRequests = this.sendingRequests.filter(
      (sendingRequests) => !this.isSubsetOfRequests(sendingRequests, requests),
    );
  };

  private onBatchRequestSuccess = (
    results: RequestResult<ResponseList<R>>,
    requests: DelayedRequestStruct<T, R>[],
  ) => {
    const { pickResult, omitDuplicatesRequest } = this.config;
    const [data] = results;

    const needResolvedRequests = omitDuplicatesRequest
      ? this.sendingRequests
          .filter((sendingRequests) => this.isSubsetOfRequests(sendingRequests, requests))
          .flat()
      : requests;

    needResolvedRequests.forEach((item) => {
      const { resolve, ids } = item;

      if (!data) {
        return resolve([]);
      }

      resolve(
        data.rows.filter((row) =>
          typeof pickResult !== 'function'
            ? ids.includes(row[pickResult as keyof R] as T)
            : pickResult(row, ids),
        ),
      );
    });

    this.removeSendingRequest(requests);
  };
  private onBatchRequestError = (
    results: RequestResult<ResponseList<R>>,
    requests: DelayedRequestStruct<T, R>[],
  ) => {
    const [_, result] = results;

    this.removeSendingRequest(requests);

    requests.forEach((item) => {
      const { reject } = item;

      reject(result.error);
    });
  };
}
