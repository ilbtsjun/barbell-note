import { useMemo, useState } from 'react';
import { Sheet } from '../components/Sheet';
import type { BodyPart, CustomDay, Equipment, Exercise, Intensity, Weekday } from '../db/types';
import { byCardioOrder, INTENSITIES } from '../lib/cardio';
import { autoExercises, candidatesFor, customRoutineName, LIMITS, STRENGTH_PARTS, type CustomVolume } from '../lib/customPlan';
import { weekdayLabel } from '../lib/dates';
import styles from './Setup.module.css';

/** 요일 수별 기본 나누기 (처음 만들 때 예시로 채운다) */
const DEFAULT_SPLIT: Record<number, BodyPart[][]> = {
  1: [['하체', '가슴', '등']],
  2: [['하체', '가슴', '등'], ['하체', '어깨', '등']],
  3: [['하체'], ['가슴', '어깨'], ['등', '팔']],
  4: [['가슴', '어깨'], ['하체'], ['등', '팔'], ['하체', '코어']],
  5: [['가슴'], ['등'], ['하체'], ['어깨', '팔'], ['코어']],
  6: [['가슴', '어깨', '팔'], ['등', '팔'], ['하체'], ['가슴', '어깨', '팔'], ['등', '팔'], ['하체']],
};

const order = (d: Weekday) => (d === 0 ? 7 : d);

/**
 * 고른 요일에 맞춰 직접 만든 계획의 기본 구성을 만든다.
 * 사용자가 고친 요일(edited)은 그대로 두고, 나머지는 요일 수에 맞는 기본 나누기로 다시 채운다.
 */
export function syncCustomDays(prev: CustomDay[], weekdays: Weekday[], exercises: Exercise[], equipment: Equipment[], edited: ReadonlySet<Weekday> = new Set()): CustomDay[] {
  const sorted = [...weekdays].sort((a, b) => order(a) - order(b));
  const split = DEFAULT_SPLIT[Math.min(sorted.length, 6)] ?? [];
  return sorted.map((weekday, i) => {
    const parts = split[i] ?? ['하체'];
    const kept = prev.find((d) => d.weekday === weekday);
    if (kept && (edited.has(weekday) || sameParts(kept.parts, parts))) return kept;
    return { weekday, parts, exercises: autoExercises(parts, exercises, equipment) };
  });
}

const sameParts = (a: BodyPart[], b: BodyPart[]) => a.length === b.length && a.every((p, i) => p === b[i]);

interface Props {
  days: CustomDay[];
  onChange: (days: CustomDay[]) => void;
  exercises: Exercise[];
  equipment: Equipment[];
  review: CustomVolume;
}

/** 직접 만들기: 요일마다 부위를 고르면 종목이 채워지고, 종목은 바꾸거나 뺄 수 있다. */
export function CustomBuilder({ days, onChange, exercises, equipment, review }: Props) {
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const cardioList = useMemo(() => exercises.filter((e) => e.part === '유산소' && (e.equipment === '맨몸' || equipment.includes(e.equipment))).sort(byCardioOrder), [exercises, equipment]);
  const [picking, setPicking] = useState<{ weekday: Weekday; replace?: string } | null>(null);

  const update = (weekday: Weekday, fn: (d: CustomDay) => CustomDay) => onChange(days.map((d) => (d.weekday === weekday ? fn(d) : d)));
  const setsOf = (weekday: Weekday, id: string) => review.days.find((d) => d.weekday === weekday)?.items.find((i) => i.exerciseId === id)?.sets;

  function togglePart(d: CustomDay, part: BodyPart) {
    const parts = d.parts.includes(part) ? d.parts.filter((p) => p !== part) : [...d.parts, part];
    update(d.weekday, (x) => ({ ...x, parts, exercises: autoExercises(parts, exercises, equipment) }));
  }

  function toggleCardio(d: CustomDay) {
    const fallback = cardioList.find((e) => e.id === 'treadmill') ?? cardioList[0];
    update(d.weekday, (x) => {
      if (x.cardio) {
        const { cardio: _c, ...rest } = x;
        return rest;
      }
      return { ...x, cardio: { exerciseId: fallback?.id ?? 'walking', minutes: 20, intensity: '보통' } };
    });
  }

  return (
    <div className={styles.builder}>
      {days.map((d) => {
        const sets = d.exercises.reduce((a, id) => a + (setsOf(d.weekday, id) ?? 0), 0);
        return (
          <div key={d.weekday} className={styles.dayBlock}>
            <div className={styles.dayHead}>
              <b>{weekdayLabel(d.weekday)}요일</b>
              <span>{customRoutineName(d, byId)}</span>
              <span className={styles.dayMeta}>
                {d.exercises.length}종목 · {sets}세트{d.cardio ? ` · 유산소 ${d.cardio.minutes}분` : ''}
              </span>
            </div>
            <div className="chips">
              {STRENGTH_PARTS.map((p) => (
                <button type="button" key={p} className="chip" aria-pressed={d.parts.includes(p)} onClick={() => togglePart(d, p)}>
                  {p}
                </button>
              ))}
              <button type="button" className="chip" aria-pressed={!!d.cardio} onClick={() => toggleCardio(d)}>
                유산소
              </button>
            </div>

            {d.exercises.length > 0 && (
              <ol className={styles.exList}>
                {d.exercises.map((id) => (
                  <li key={id}>
                    <span className={styles.exName}>{byId.get(id)?.name ?? id}</span>
                    <span className={styles.exSets}>{setsOf(d.weekday, id) ?? '-'}세트</span>
                    <button type="button" className={styles.mini} onClick={() => setPicking({ weekday: d.weekday, replace: id })} aria-label={`${byId.get(id)?.name} 다른 운동으로 바꾸기`}>
                      바꾸기
                    </button>
                    <button
                      type="button"
                      className={styles.mini}
                      onClick={() => update(d.weekday, (x) => ({ ...x, exercises: x.exercises.filter((e) => e !== id) }))}
                      aria-label={`${byId.get(id)?.name} 빼기`}
                    >
                      빼기
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {d.exercises.length < LIMITS.maxExercisesPerDay && (
              <button type="button" className={`btn sm line ${styles.addEx}`} onClick={() => setPicking({ weekday: d.weekday })}>
                종목 추가
              </button>
            )}

            {d.cardio && (
              <div className={styles.cardioBox}>
                <div className="chips">
                  {cardioList.map((e) => (
                    <button type="button" key={e.id} className="chip" aria-pressed={d.cardio?.exerciseId === e.id} onClick={() => update(d.weekday, (x) => ({ ...x, cardio: { ...x.cardio!, exerciseId: e.id } }))}>
                      {e.name}
                    </button>
                  ))}
                </div>
                <div className={styles.cardioLine}>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      onClick={() => update(d.weekday, (x) => ({ ...x, cardio: { ...x.cardio!, minutes: Math.max(10, x.cardio!.minutes - 5) } }))}
                      aria-label="유산소 5분 줄이기"
                    >
                      −
                    </button>
                    <span className="num">{d.cardio.minutes}분</span>
                    <button
                      type="button"
                      onClick={() => update(d.weekday, (x) => ({ ...x, cardio: { ...x.cardio!, minutes: Math.min(LIMITS.maxCardioMinutes, x.cardio!.minutes + 5) } }))}
                      aria-label="유산소 5분 늘리기"
                    >
                      +
                    </button>
                  </div>
                  <div className="chips">
                    {INTENSITIES.map((v: Intensity) => (
                      <button type="button" key={v} className="chip" aria-pressed={d.cardio?.intensity === v} onClick={() => update(d.weekday, (x) => ({ ...x, cardio: { ...x.cardio!, intensity: v } }))}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className={styles.review} data-bad={review.errors.length > 0 || undefined} aria-live="polite">
        <b>무리 점검</b>
        {review.errors.map((e) => (
          <p key={e} className={styles.reviewErr}>
            {e}
          </p>
        ))}
        {review.notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
        {!review.errors.length && !review.notes.length && <p className={styles.reviewOk}>무리한 부분이 없습니다. 무게는 지금 기록에 맞춰 4주마다 가볍게 쉬어 가며 올립니다.</p>}
      </div>

      {picking && (
        <ExercisePicker
          title={picking.replace ? `${byId.get(picking.replace)?.name} 대신 할 운동` : `${weekdayLabel(picking.weekday)}요일에 넣을 운동`}
          startPart={(picking.replace && (byId.get(picking.replace)?.part as BodyPart)) || days.find((d) => d.weekday === picking.weekday)?.parts[0] || '가슴'}
          exercises={exercises}
          equipment={equipment}
          exclude={days.find((d) => d.weekday === picking.weekday)?.exercises ?? []}
          onPick={(id) => {
            update(picking.weekday, (x) => ({ ...x, exercises: picking.replace ? x.exercises.map((e) => (e === picking.replace ? id : e)) : [...x.exercises, id] }));
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

function ExercisePicker(props: { title: string; startPart: BodyPart; exercises: Exercise[]; equipment: Equipment[]; exclude: string[]; onPick: (id: string) => void; onClose: () => void }) {
  const [part, setPart] = useState<BodyPart>(props.startPart);
  const list = candidatesFor(part, props.exercises, props.equipment).filter((e) => !props.exclude.includes(e.id));
  return (
    <Sheet label={props.title} onClose={props.onClose}>
      <h2 className="sec-title">{props.title}</h2>
      <div className="chips scroll">
        {STRENGTH_PARTS.map((p) => (
          <button type="button" key={p} className="chip" aria-pressed={p === part} onClick={() => setPart(p)}>
            {p}
          </button>
        ))}
      </div>
      <div className={styles.pickList}>
        {list.map((e) => (
          <button type="button" key={e.id} className={styles.pickItem} onClick={() => props.onPick(e.id)}>
            <b>{e.name}</b>
            <span className="sub">{e.equipment}</span>
          </button>
        ))}
        {!list.length && <p className="sub">가진 기구로 할 수 있는 다른 {part} 운동이 없습니다.</p>}
      </div>
    </Sheet>
  );
}
