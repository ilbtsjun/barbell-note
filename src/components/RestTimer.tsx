import { useEffect, useRef, useState } from 'react';
import type { RestTimer as Rest } from '../db/types';
import styles from './RestTimer.module.css';

interface Props {
  rest: Rest | undefined;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
  /** 시간이 다 됐을 때 한 번 */
  onEnd: () => void;
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** 탭 막대 위에 떠 있는 쉬는 시간 타이머. 끝나는 시각 기준이라 화면을 껐다 켜도 맞다. */
export function RestTimer({ rest, onAdjust, onSkip, onEnd }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef<number | null>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    if (!rest) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [rest]);

  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  useEffect(() => {
    if (rest && left === 0 && ended.current !== rest.endsAt) {
      ended.current = rest.endsAt;
      endRef.current();
    }
  }, [rest, left]);

  const on = !!rest && left > 0;
  return (
    <div className={styles.timer} data-on={on || undefined} aria-hidden={!on}>
      <div className={styles.inner}>
        <span className={`num ${styles.num}`} role="timer" aria-label={`쉬는 시간 ${left}초 남음`}>
          {fmt(left)}
        </span>
        <span className={styles.lbl}>
          쉬는 중<span className={styles.name}>{rest?.label}</span>
        </span>
        <span className={styles.btns}>
          <button type="button" className={`btn sm ${styles.ghost}`} onClick={() => onAdjust(-15)} tabIndex={on ? 0 : -1} aria-label="15초 줄이기">
            -15
          </button>
          <button type="button" className={`btn sm ${styles.ghost}`} onClick={() => onAdjust(15)} tabIndex={on ? 0 : -1} aria-label="15초 늘리기">
            +15
          </button>
          <button type="button" className={`btn sm ${styles.ghost}`} onClick={onSkip} tabIndex={on ? 0 : -1}>
            건너뛰기
          </button>
        </span>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${rest ? (left / rest.total) * 100 : 0}%` }} />
        </div>
      </div>
    </div>
  );
}
