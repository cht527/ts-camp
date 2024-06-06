import { useEffect, useState } from 'react';
import useLatest from './useLatest';

export type Config = {
  onHide?: () => void;
  onShow?: () => void;
  onChange?: (visible: boolean) => void;
};

const noop = () => {};

// hook 版本
export const useVisibilityChange = (config: Config = {}) => {
  const configRef = useLatest(config);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const { onHide = noop, onShow = noop, onChange = noop } = configRef.current;
      const isHidden = document.visibilityState === 'hidden';

      onChange(!isHidden);
      if (isHidden) {
        onHide();
      } else {
        onShow();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [configRef]);
};

// util 版本
export const callVisibilityChange = (config: Config = {}) => {
  const handleVisibilityChange = () => {
    const { onHide = noop, onShow = noop, onChange = noop } = config;
    const isHidden = document.visibilityState === 'hidden';

    onChange(!isHidden);
    if (isHidden) {
      onHide();
    } else {
      onShow();
    }
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

export const useVisibilityStatus = () => {
  const [status, setStatus] = useState(true);

  useEffect(
    () =>
      callVisibilityChange({
        onShow() {
          setStatus(true);
        },
        onHide() {
          setStatus(false);
        },
      }),
    [],
  );

  return status;
};
