export type Config = {
  onHide?: () => void;
  onShow?: () => void;
  onChange?: (visible: boolean) => void;
};

const noop = () => {};

export const callVisibilityChange = (config: Config = {}) => {
  const handleVisibilityChange = () => {
    const { onHide = noop, onShow = noop, onChange = noop } = config;
    const isHidden = document.visibilityState === "hidden";

    onChange(!isHidden);
    if (isHidden) {
      onHide();
    } else {
      onShow();
    }
  };

  window.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};

type CustomizeLoopOptions = {
  // 页面展示时执行回调
  fireOnPageShow?: boolean;
  // 页面不可见时停止
  stopOnPageHide?: boolean;
  // loop 间隔
  interval: number;
  // 是否初始化时执行回调
  fireOnInit?: boolean;
};

export default function customizeLoop(
  callback: () => void,
  options: CustomizeLoopOptions
) {
  const { interval, fireOnPageShow, stopOnPageHide, fireOnInit } = options;
  let timerId: number;

  const stopTimer = () => clearTimeout(timerId);
  const resetTimer = (callback: () => void) => {
    stopTimer();

    timerId = window.setTimeout(async () => {
      callback();
      resetTimer(callback);
    }, interval);
  };

  if (fireOnInit) {
    callback();
  }

  // 注册 timer
  resetTimer(callback);

  // 注册监听页面展示事件
  const cancelVisibilityChangeCall = callVisibilityChange({
    onShow: () => {
      if (fireOnPageShow) {
        callback();
      }
      resetTimer(callback);
    },
    onHide: () => {
      if (stopOnPageHide) {
        stopTimer();
      }
    },
  });

  return () => {
    window.clearTimeout(timerId);
    cancelVisibilityChangeCall();
  };
}
