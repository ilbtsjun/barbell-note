import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdatePrompt.module.css';

/**
 * 새 버전이 올라오면 알려주고, 업데이트를 누르면 바로 적용한다.
 * 앱을 열 때마다 새 버전이 있는지 확인한다 (다른 앱에 갔다가 돌아올 때도 포함).
 */
export function UpdatePrompt() {
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine === false || registration.installing) return;
        registration.update().catch(() => {
          /* 인터넷이 없으면 다음에 다시 확인한다 */
        });
      };
      check();
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    },
    onRegisterError: (err) => console.error('오프라인 기능을 켜지 못했습니다', err),
  });
  if (!needRefresh) return null;
  return (
    <div className={styles.bar} role="status">
      <span>새 버전이 나왔습니다</span>
      <button type="button" className="btn sm line" onClick={() => setNeedRefresh(false)} disabled={updating}>
        나중에
      </button>
      <button
        type="button"
        className={`btn sm ${styles.go}`}
        disabled={updating}
        onClick={() => {
          setUpdating(true);
          updateServiceWorker(true);
        }}
      >
        {updating ? '업데이트 중' : '업데이트'}
      </button>
    </div>
  );
}
