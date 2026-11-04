import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { backupSummary, exportBackup, parseBackup, restoreBackup, type Backup } from '../db/backup';
import { koreanDate, toISODate } from '../lib/dates';
import styles from './DataSection.module.css';
import { useToast } from './Toast';

const LAST_BACKUP_KEY = 'barbell-note:last-backup';

const readLast = () => {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
};

/** 백업 내려받기, 되돌리기, 저장 공간 보관 요청 */
export function DataSection() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [lastBackup, setLastBackup] = useState(readLast);
  const [pending, setPending] = useState<Backup | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  async function download() {
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barbell-note-backup-${toISODate(new Date())}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      const today = toISODate(new Date());
      try {
        localStorage.setItem(LAST_BACKUP_KEY, today);
      } catch {
        /* 기억 못 해도 백업은 됐다 */
      }
      setLastBackup(today);
      toast(`백업 파일을 내려받았습니다 (${backupSummary(backup)})`);
    } catch (err) {
      console.error(err);
      toast('백업 파일을 만들지 못했습니다');
    }
  }

  async function pick(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    setError('');
    setPending(null);
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 파일을 읽지 못했습니다.');
    }
  }

  async function restore() {
    if (!pending) return;
    try {
      await restoreBackup(pending);
      setPending(null);
      toast('백업으로 되돌렸습니다');
    } catch (err) {
      console.error(err);
      setError('되돌리지 못했습니다. 지금 데이터는 그대로입니다.');
    }
  }

  async function askPersist() {
    const ok = (await navigator.storage?.persist?.().catch(() => false)) ?? false;
    setPersisted(ok);
    toast(ok ? '이 기기에 기록을 보관하도록 설정했습니다' : '브라우저가 거절했습니다. 홈 화면에 설치하면 보통 허용됩니다');
  }

  return (
    <section className="sec">
      <h2 className="sec-title">데이터 관리</h2>
      <p className="sub">
        기록은 이 폰 안에만 저장됩니다. 폰을 바꾸거나 앱을 지우기 전에 백업 파일을 내려받아 두세요.
        {lastBackup && ` 마지막 백업: ${koreanDate(new Date(lastBackup + 'T00:00:00'))}.`}
      </p>
      <div className={styles.row}>
        <button type="button" className="btn" onClick={download}>
          백업 내려받기
        </button>
        <button type="button" className="btn line" onClick={() => fileRef.current?.click()}>
          백업 불러오기
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pick} aria-label="백업 파일 선택" />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {pending && (
        <div className={styles.confirm} role="alert">
          <p>
            <b>{koreanDate(new Date(pending.exportedAt))}</b>에 만든 백업입니다 ({backupSummary(pending)}). 되돌리면 지금 폰에 있는 기록은 모두 이 백업으로 바뀝니다.
          </p>
          <div className={styles.row}>
            <button type="button" className="btn line" onClick={() => setPending(null)}>
              그만두기
            </button>
            <button type="button" className={`btn ${styles.danger}`} onClick={restore}>
              되돌리기
            </button>
          </div>
        </div>
      )}
      {persisted === false && (
        <div className={styles.persist}>
          <span>브라우저가 저장 공간이 부족할 때 기록을 지울 수 있습니다.</span>
          <button type="button" className="btn sm line" onClick={askPersist}>
            보관 요청
          </button>
        </div>
      )}
      {persisted === true && <p className={styles.ok}>이 기기에 기록을 보관하도록 설정되어 있습니다.</p>}
    </section>
  );
}
