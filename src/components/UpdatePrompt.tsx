import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdatePrompt.module.css';

/** 새 버전이 올라오면 알려주고, 누르면 새로고침해서 적용한다. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (err) => console.error('오프라인 기능을 켜지 못했습니다', err),
  });
  if (!needRefresh) return null;
  return (
    <div className={styles.bar} role="status">
      <span>새 버전이 있습니다</span>
      <button type="button" className="btn sm line" onClick={() => setNeedRefresh(false)}>
        나중에
      </button>
      <button type="button" className={`btn sm ${styles.go}`} onClick={() => updateServiceWorker(true)}>
        새로고침
      </button>
    </div>
  );
}
