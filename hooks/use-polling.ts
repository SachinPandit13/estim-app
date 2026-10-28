'use client';

import { useEffect, useRef } from 'react';

interface PollingOptions {
  intervalMs?: number;
  enabled?: boolean;
  runImmediately?: boolean;
}

export function usePolling(
  callback: () => Promise<void> | void,
  { intervalMs = 15000, enabled = true, runImmediately = true }: PollingOptions = {},
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;

    const execute = async () => {
      // Avoid firing if tab is in the background
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      try {
        await savedCallback.current();
      } catch {
        // Individual error handling should be done inside callback
      }
    };

    if (runImmediately) {
      execute();
    }

    timerId = setInterval(() => {
      if (isMounted) {
        execute();
      }
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        execute();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (timerId) clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled, runImmediately]);
}
