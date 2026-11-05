import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import type { CardioEntry, Exercise, Intensity } from '../db/types';
import { cardioKcal, INTENSITIES, INTENSITY_HINT } from '../lib/cardio';
import styles from './Today.module.css';

interface Props {
  entry: CardioEntry & { done: boolean };
  cardioExercises: Exercise[];
  bodyWeight: number;
  /** 시간을 재고 있으면 시작 시각 */
  clockStartedAt?: number;
  onStartClock: () => void;
  /** 시간 재기를 멈춘다. 잰 시간(초)을 돌려준다. */
  onStopClock: () => number;
  onSave: (entry: CardioEntry) => void;
  onRemove: () => void;
  onClose: () => void;
}

/** 1초마다 지금 시각 (켜져 있을 때만) */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export const clockLabel = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/** 유산소 한 개 기록: 종류, 강도, 시간(직접 입력 또는 시간 재기), 거리 */
export function CardioSheet({ entry, cardioExercises, bodyWeight, clockStartedAt, onStartClock, onStopClock, onSave, onRemove, onClose }: Props) {
  const [exerciseId, setExerciseId] = useState(entry.exerciseId);
  const [intensity, setIntensity] = useState<Intensity>(entry.intensity);
  const [minutes, setMinutes] = useState(String(entry.minutes));
  const [distance, setDistance] = useState(entry.distanceKm ? String(entry.distanceKm) : '');
  const running = clockStartedAt !== undefined;
  const now = useNow(running);
  const elapsed = running ? Math.max(0, Math.floor((now - clockStartedAt) / 1000)) : 0;

  const m = parseInt(minutes, 10);
  const km = distance ? parseFloat(distance) : undefined;
  const valid = m >= 1 && m <= 600 && (km === undefined || (km > 0 && km <= 200));

  function stop() {
    const sec = onStopClock();
    setMinutes(String(Math.max(1, Math.round(sec / 60))));
  }

  function save() {
    // 재는 중이면 잰 시간으로 넣는다 (시계 정리는 저장하는 쪽에서 한다)
    const mins = running ? Math.max(1, Math.round((Date.now() - clockStartedAt) / 60000)) : m;
    const out: CardioEntry = { exerciseId, intensity, minutes: mins };
    if (km) out.distanceKm = Math.round(km * 100) / 100;
    onSave(out);
  }

  return (
    <Sheet label="유산소 기록" onClose={onClose}>
      <h2 className="sec-title">유산소 기록</h2>
      <div className="chips">
        {cardioExercises.map((e) => (
          <button type="button" key={e.id} className="chip" aria-pressed={e.id === exerciseId} onClick={() => setExerciseId(e.id)}>
            {e.name}
          </button>
        ))}
      </div>

      <div className={styles.clock} data-running={running || undefined}>
        <span className={`num ${styles.clockNum}`} role="timer" aria-label={`잰 시간 ${clockLabel(elapsed)}`}>
          {clockLabel(elapsed)}
        </span>
        {running ? (
          <button type="button" className="btn" onClick={stop}>
            멈추고 시간 넣기
          </button>
        ) : (
          <button type="button" className="btn line" onClick={onStartClock}>
            시간 재기 시작
          </button>
        )}
      </div>

      <div className={styles.cardioGrid}>
        <label className={styles.stepLbl} htmlFor="cardio-min">
          시간
        </label>
        <div className={styles.unitInput}>
          <input id="cardio-min" className={`num ${styles.stepInput}`} type="number" inputMode="numeric" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} disabled={running} />
          <span className={styles.stepUnit}>분</span>
        </div>
        <label className={styles.stepLbl} htmlFor="cardio-km">
          거리
        </label>
        <div className={styles.unitInput}>
          <input id="cardio-km" className={`num ${styles.stepInput}`} type="number" inputMode="decimal" step="0.1" min={0} placeholder="선택" value={distance} onChange={(e) => setDistance(e.target.value)} />
          <span className={styles.stepUnit}>km</span>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.stepLbl}>강도</span>
        <div className="chips">
          {INTENSITIES.map((v) => (
            <button type="button" key={v} className="chip" aria-pressed={v === intensity} onClick={() => setIntensity(v)}>
              {v}
            </button>
          ))}
        </div>
        <span className="sub">
          {INTENSITY_HINT[intensity]}
          {valid ? ` · 약 ${cardioKcal({ exerciseId, intensity, minutes: running ? Math.max(1, Math.round(elapsed / 60)) : m }, bodyWeight)}kcal` : ''}
        </span>
      </div>

      <button type="button" className="btn" disabled={!valid && !running} onClick={save}>
        {entry.done ? '고친 내용 저장' : '완료'}
      </button>
      <button type="button" className={`btn line ${styles.discard}`} onClick={onRemove}>
        오늘 목록에서 빼기
      </button>
    </Sheet>
  );
}
