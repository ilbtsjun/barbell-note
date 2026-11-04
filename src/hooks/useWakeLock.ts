import { useEffect } from 'react';

/** 운동하는 동안 화면이 꺼지지 않게 한다. 지원하지 않는 브라우저에서는 아무것도 하지 않는다. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const request = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        lock = await navigator.wakeLock.request('screen');
        if (stopped) void lock.release();
      } catch {
        /* 배터리 절약 모드 등으로 거절되면 그냥 둔다 */
      }
    };
    // 다른 앱에 다녀오면 잠금이 풀리므로 다시 요청한다
    const onVisible = () => document.visibilityState === 'visible' && void request();
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}
