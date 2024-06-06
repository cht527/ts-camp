/**
 * 获取重试延迟时间。
 * 使用指数退避算法，随机延迟 0.5 ~ 1.5 倍的时间。
 * @see https://en.wikipedia.org/wiki/Exponential_backoff
 */
export const getDelaySeconds = (retryCount: number, intervalSeconds = 1) =>
  ~~((Math.random() + 0.5) * (1 << retryCount)) * intervalSeconds;
