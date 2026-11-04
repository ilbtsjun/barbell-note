import { useRef, useState } from 'react';
import { Band } from '../components/Band';
import { Icon } from '../components/icons';
import { Plates } from '../components/Plates';
import { RestTimer } from '../components/RestTimer';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { discardWorkout, finishWorkout, saveWorkout } from '../db/workoutRepo';
import type { Exercise, Profile, Workout } from '../db/types';
import { useWakeLock } from '../hooks/useWakeLock';
import { beep, buzz, primeAudio } from '../lib/alert';
import { isHold } from '../lib/templates';
import { durationMinutes, editSet, isExerciseDone, nextOpenExercise, nextSet, setsDone, setsLeft, toggleSet, weightStep } from '../lib/workout';
import styles from './Today.module.css';

interface Props {
  initial: Workout;
  /** 이미 저장된 운동인지 (아니면 첫 체크 때 저장을 시작한다) */
  saved: boolean;
  exMap: Map<string, Exercise>;
  profile: Profile | null;
  heading: string;
}

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 세트 표, 휴식 타이머, 원판 그림. 체크할 때마다 폰에 저장한다. */
export function WorkoutView({ initial, saved: savedAtStart, exMap, profile, heading }: Props) {
  const toast = useToast();
  const [w, setW] = useState(initial);
  const [saved, setSaved] = useState(savedAtStart);
  const [open, setOpen] = useState(() => Math.max(0, initial.exercises.findIndex((e) => !isExerciseDone(e))));
  const [editing, setEditing] = useState<{ ex: number; set: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const listRef = useRef<HTMLDivElement>(null);
  useWakeLock(saved);

  const name = (id: string) => exMap.get(id)?.name ?? id;

  function commit(next: Workout) {
    const value = saved ? next : { ...next, startedAt: Date.now() };
    setW(value);
    setSaved(true);
    pending.current = pending.current.then(() => saveWorkout(value)).catch((err) => {
      console.error(err);
      toast('저장하지 못했습니다. 저장 공간을 확인해 주세요');
    });
  }

  function openExercise(i: number, scroll = false) {
    setOpen(i);
    if (!scroll || i < 0) return;
    window.setTimeout(() => {
      listRef.current?.querySelector(`[data-ex="${i}"]`)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }, 340);
  }

  function tick(exIndex: number, setIndex: number) {
    primeAudio();
    let next = toggleSet(w, exIndex, setIndex);
    const ex = next.exercises[exIndex];
    if (!ex.sets[setIndex].done) return commit(next);

    const finishedEx = isExerciseDone(ex);
    const after = finishedEx ? nextOpenExercise(next, exIndex) : exIndex;
    if (setsLeft(next) > 0) {
      const label = finishedEx ? `다음: ${name(next.exercises[after].exerciseId)}` : `${name(ex.exerciseId)} ${nextSet(ex) + 1}세트 준비`;
      next = { ...next, rest: { endsAt: Date.now() + ex.restSec * 1000, total: ex.restSec, label } };
    } else {
      next = { ...next, rest: undefined };
    }
    commit(next);
    if (finishedEx) window.setTimeout(() => openExercise(after, true), 420);
  }

  function adjustRest(delta: number) {
    if (!w.rest) return;
    const endsAt = w.rest.endsAt + delta * 1000;
    if (endsAt <= Date.now()) return commit({ ...w, rest: undefined });
    commit({ ...w, rest: { ...w.rest, endsAt, total: Math.max(1, w.rest.total + delta) } });
  }

  function restEnded() {
    buzz();
    beep();
    toast('쉬는 시간이 끝났습니다. 다음 세트를 시작하세요');
    commit({ ...w, rest: undefined });
  }

  async function finish(memo: string) {
    await pending.current;
    const id = await finishWorkout(memo);
    toast(id ? '오늘 운동을 기록에 저장했습니다' : '완료한 세트가 없어 기록하지 않았습니다');
  }

  async function discard() {
    await pending.current;
    await discardWorkout();
    toast('기록하지 않고 끝냈습니다');
  }

  const left = setsLeft(w);
  const done = setsDone(w);

  return (
    <>
      <Band>
        <p>{heading}</p>
        <h1>오늘은 {w.routineName}</h1>
        <p>
          {w.exercises.length}종목 · {left ? `${left}세트 남음` : '모두 끝났습니다'}
        </p>
        <div className={styles.strip} style={{ gridTemplateColumns: `repeat(${w.exercises.length}, 1fr)` }} aria-hidden="true">
          {w.exercises.map((e) => (
            <span key={e.exerciseId}>
              <i style={{ transform: `scaleX(${e.sets.filter((s) => s.done).length / (e.sets.length || 1)})` }} />
            </span>
          ))}
        </div>
      </Band>

      <div ref={listRef}>
        {w.exercises.map((ex, i) => {
          const info = exMap.get(ex.exerciseId);
          const hold = isHold(ex.exerciseId);
          const unit = hold ? '초' : '회';
          const nx = nextSet(ex);
          const exDone = isExerciseDone(ex);
          const isOpen = open === i;
          const shown = ex.sets[nx === -1 ? ex.sets.length - 1 : nx] ?? ex.sets[0];
          return (
            <section key={ex.exerciseId} className={styles.ex} data-ex={i} data-open={isOpen || undefined} data-done={exDone || undefined}>
              <button type="button" className={styles.exBtn} aria-expanded={isOpen} onClick={() => openExercise(isOpen ? -1 : i)}>
                <span className={styles.exNo}>{exDone ? <Icon name="check" size={18} stroke={2.4} /> : i + 1}</span>
                <span>
                  <span className={styles.exName}>{name(ex.exerciseId)}</span>
                  <br />
                  <span className={styles.exMeta}>
                    {ex.sets.length}세트 × {shown?.reps}
                    {unit} · 쉬는 시간 {ex.restSec}초
                  </span>
                </span>
                <span className={styles.exLoad}>
                  {shown?.weight ? (
                    <>
                      <b className="num">{shown.weight}</b>
                      <small>kg</small>
                    </>
                  ) : (
                    <small>맨몸</small>
                  )}
                </span>
              </button>
              <div
                className={styles.wrap}
                ref={(el) => {
                  // 접힌 종목 안의 버튼은 키보드로도 못 가게 한다
                  if (el) el.inert = !isOpen;
                }}
              >
                <div className={styles.body}>
                  <div className={styles.inner}>
                    {info?.barbell && shown?.weight ? <Plates total={shown.weight} bar={profile?.barWeight} plates={profile?.plates} /> : null}
                    <table className={styles.sets}>
                      <thead>
                        <tr>
                          <th>세트</th>
                          <th>무게</th>
                          <th>{hold ? '시간' : '횟수'}</th>
                          <th>완료</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ex.sets.map((s, si) => (
                          <tr key={si} data-state={s.done ? 'done' : si === nx ? 'next' : 'pending'}>
                            <td className={styles.v}>{si + 1}</td>
                            <td className={styles.v}>
                              <button type="button" className={styles.cell} onClick={() => setEditing({ ex: i, set: si })} aria-label={`${si + 1}세트 무게와 ${hold ? '시간' : '횟수'} 고치기`}>
                                {s.weight ? (
                                  <>
                                    {s.weight}
                                    <small>kg</small>
                                  </>
                                ) : (
                                  <small>맨몸</small>
                                )}
                              </button>
                            </td>
                            <td className={styles.v}>
                              <button type="button" className={styles.cell} onClick={() => setEditing({ ex: i, set: si })} tabIndex={-1} aria-hidden="true">
                                {s.reps}
                                <small>{unit}</small>
                              </button>
                            </td>
                            <td>
                              <button type="button" className={styles.tick} aria-pressed={s.done} aria-label={`${name(ex.exerciseId)} ${si + 1}세트 완료`} onClick={() => tick(i, si)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path className={styles.ck} d="M5 12.5l4.5 4.5L19 7.5" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {(saved || done > 0) && (
        <div className="sec" style={{ borderBottom: 0 }}>
          <button type="button" className={left ? 'btn line' : 'btn'} onClick={() => setFinishing(true)}>
            {left ? '운동 끝내기' : '오늘 운동 저장하기'}
          </button>
        </div>
      )}

      {/* 타이머가 떠 있을 때 마지막 줄이 가려지지 않게 */}
      {w.rest && <div style={{ height: 96 }} aria-hidden="true" />}
      <RestTimer rest={w.rest} onAdjust={adjustRest} onSkip={() => commit({ ...w, rest: undefined })} onEnd={restEnded} />

      {editing && (
        <EditSetSheet
          title={`${name(w.exercises[editing.ex].exerciseId)} ${editing.set + 1}세트`}
          weight={w.exercises[editing.ex].sets[editing.set].weight}
          reps={w.exercises[editing.ex].sets[editing.set].reps}
          step={weightStep(exMap.get(w.exercises[editing.ex].exerciseId)?.equipment)}
          hold={isHold(w.exercises[editing.ex].exerciseId)}
          onClose={() => setEditing(null)}
          onApply={(patch) => {
            commit(editSet(w, editing.ex, editing.set, patch));
            setEditing(null);
          }}
        />
      )}

      {finishing && (
        <FinishSheet
          minutes={durationMinutes(w.startedAt, Date.now())}
          done={done}
          left={left}
          onClose={() => setFinishing(false)}
          onFinish={finish}
          onDiscard={discard}
        />
      )}
    </>
  );
}

function Stepper({ id, label, value, step, unit, onChange }: { id: string; label: string; value: string; step: number; unit: string; onChange: (v: string) => void }) {
  const bump = (d: number) => {
    const n = Math.max(0, Math.round(((parseFloat(value) || 0) + d) * 100) / 100);
    onChange(String(n));
  };
  return (
    <div className={styles.stepRow}>
      <label htmlFor={id} className={styles.stepLbl}>
        {label}
      </label>
      <div className={styles.stepper}>
        <button type="button" className={styles.stepBtn} onClick={() => bump(-step)} aria-label={`${label} ${step} 줄이기`}>
          −
        </button>
        <input id={id} className={`num ${styles.stepInput}`} type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
        <span className={styles.stepUnit}>{unit}</span>
        <button type="button" className={styles.stepBtn} onClick={() => bump(step)} aria-label={`${label} ${step} 늘리기`}>
          +
        </button>
      </div>
    </div>
  );
}

function EditSetSheet(props: {
  title: string;
  weight: number;
  reps: number;
  step: number;
  hold: boolean;
  onClose: () => void;
  onApply: (patch: { weight: number; reps: number }) => void;
}) {
  const [weight, setWeight] = useState(String(props.weight));
  const [reps, setReps] = useState(String(props.reps));
  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const valid = w >= 0 && w <= 500 && r >= 1 && r <= 600;
  return (
    <Sheet label={`${props.title} 고치기`} onClose={props.onClose}>
      <h2 className="sec-title">{props.title}</h2>
      <Stepper id="edit-weight" label="무게" value={weight} step={props.step} unit="kg" onChange={setWeight} />
      <Stepper id="edit-reps" label={props.hold ? '시간' : '횟수'} value={reps} step={props.hold ? 5 : 1} unit={props.hold ? '초' : '회'} onChange={setReps} />
      <p className="sub">아직 안 한 뒤 세트도 같이 바뀝니다.</p>
      <button type="button" className="btn" disabled={!valid} onClick={() => props.onApply({ weight: w, reps: r })}>
        적용
      </button>
    </Sheet>
  );
}

function FinishSheet(props: { minutes: number; done: number; left: number; onClose: () => void; onFinish: (memo: string) => Promise<void>; onDiscard: () => Promise<void> }) {
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };
  return (
    <Sheet label="운동 끝내기" onClose={props.onClose}>
      <h2 className="sec-title">운동 끝내기</h2>
      <p className={styles.finishNums}>
        <span>
          <b className="num">{props.minutes}</b>분
        </span>
        <span>
          <b className="num">{props.done}</b>세트 완료
        </span>
      </p>
      {props.left > 0 && props.done > 0 && <p className="sub">남은 {props.left}세트는 하지 않은 것으로 저장합니다.</p>}
      {props.done > 0 && (
        <>
          <label htmlFor="finish-memo" className={styles.stepLbl}>
            메모 (선택)
          </label>
          <textarea id="finish-memo" className={styles.memo} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="컨디션, 자세에서 느낀 점" />
          <button type="button" className="btn" disabled={busy} onClick={() => run(() => props.onFinish(memo))}>
            기록 저장
          </button>
        </>
      )}
      <button type="button" className={`btn line ${styles.discard}`} disabled={busy} onClick={() => (confirmDiscard ? run(props.onDiscard) : setConfirmDiscard(true))}>
        {confirmDiscard ? '한 번 더 누르면 기록 없이 끝냅니다' : '기록하지 않고 끝내기'}
      </button>
    </Sheet>
  );
}
