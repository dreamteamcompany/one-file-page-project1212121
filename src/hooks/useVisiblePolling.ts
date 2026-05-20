import { useEffect, useRef } from 'react';

/**
 * Запускает callback по интервалу, но ТОЛЬКО когда вкладка в фокусе.
 * Когда пользователь сворачивает окно/переключает вкладку — таймер ставится на паузу.
 * Когда возвращается — сразу вызывается callback и таймер запускается заново.
 *
 * Это сильно экономит compute-секунды на бэкенде (нет фоновых опросов в скрытых вкладках).
 */
export const useVisiblePolling = (
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean = true,
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled || !intervalMs) return;

    let timerId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timerId !== null) return;
      timerId = setInterval(() => {
        callbackRef.current();
      }, intervalMs);
    };

    const stop = () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') {
      start();
    }

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, enabled]);
};

export default useVisiblePolling;
