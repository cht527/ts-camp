import { Optional } from "@/typings/tool";

type ID = string | number;

type WithExpiredTime<T> = [data: T, expiredTime: number];

// 默认过期时间为 10 min
const DEFAULT_EXPIRED_TIME = 10 * 60 * 1000;

export class CacheMap<T = never> {
  private cachedMap: Map<ID, WithExpiredTime<T>>;
  // 设置为 0 时永不过期
  constructor(private expiredTime = DEFAULT_EXPIRED_TIME) {
    this.cachedMap = new Map();
  }

  get = (id: ID): T | undefined => {
    const cached = this.cachedMap.get(id);

    if (cached) {
      const [value, expiredTime] = cached;

      if (expiredTime === 0 || expiredTime > Date.now()) {
        return value;
      }
      this.delete(id);
    }
  };

  set = (id: ID, value: T, expiredTime?: number): void => {
    const mergedExpiredTime = expiredTime ?? this.expiredTime;

    this.cachedMap.set(id, [value, mergedExpiredTime === 0 ? 0 : Date.now() + mergedExpiredTime]);
  };

  delete = (id: ID): void => {
    this.cachedMap.delete(id);
  };

  batchDelete = (ids: ID[]): void => {
    ids.forEach((id) => {
      this.delete(id);
    });
  };

  batchGet = (ids: ID[]): Optional<T>[] => ids.map((id) => this.get(id));

  batchSet = (idValues: ([ID, T] | [ID, T, number])[]): void => {
    idValues.forEach(([id, value, expiredTime]) => {
      this.set(id, value, expiredTime);
    });
  };

  forEach = (callback: (value: T, key: ID, map: Map<ID, WithExpiredTime<T>>) => void): void => {
    this.cachedMap.forEach(([value], key) => {
      callback(value, key, this.cachedMap);
    });
  };
}
