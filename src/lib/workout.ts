import type { Equipment, PlanDay, Session, SessionExercise, SetRecord, Workout } from '../db/types';

/** 무게를 고칠 때 한 번에 바뀌는 양 (덤벨 1kg, 나머지 2.5kg) */
export const weightStep = (equipment?: Equipment) => (equipment === '덤벨' ? 1 : 2.5);

/** 계획의 하루로 새 운동을 만든다. 아직 저장하지 않은 상태. */
export function workoutFromDay(day: Pick<PlanDay, 'planId' | 'week' | 'routineName' | 'items'>, date: string, now: number): Workout {
  return {
    id: 'current',
    date,
    routineName: day.routineName,
    startedAt: now,
    planId: day.planId,
    week: day.week,
    exercises: day.items.map((it) => ({
      exerciseId: it.exerciseId,
      restSec: it.restSec,
      sets: Array.from({ length: it.sets }, () => ({ weight: it.weight, reps: it.reps, done: false })),
    })),
  };
}

/** 다음에 할 세트 번호. 다 했으면 -1. */
export const nextSet = (ex: SessionExercise) => ex.sets.findIndex((s) => !s.done);

export const isExerciseDone = (ex: SessionExercise) => ex.sets.length > 0 && nextSet(ex) === -1;

export const setsLeft = (w: Pick<Workout, 'exercises'>) => w.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.done).length, 0);

export const setsDone = (w: Pick<Workout, 'exercises'>) => w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

function mapSets(w: Workout, exIndex: number, fn: (s: SetRecord, i: number) => SetRecord): Workout {
  return { ...w, exercises: w.exercises.map((e, i) => (i === exIndex ? { ...e, sets: e.sets.map(fn) } : e)) };
}

/** 세트 완료를 켜고 끈다. */
export function toggleSet(w: Workout, exIndex: number, setIndex: number): Workout {
  return mapSets(w, exIndex, (s, i) => (i === setIndex ? { ...s, done: !s.done } : s));
}

/** 세트의 무게나 횟수를 고친다. 그 뒤에 아직 안 한 세트도 같이 바꾼다. */
export function editSet(w: Workout, exIndex: number, setIndex: number, patch: Partial<Pick<SetRecord, 'weight' | 'reps'>>): Workout {
  return mapSets(w, exIndex, (s, i) => (i === setIndex || (i > setIndex && !s.done) ? { ...s, ...patch } : s));
}

/** i번 종목 다음으로 남은 세트가 있는 종목. 없으면 앞에서부터 찾고, 그래도 없으면 -1. */
export function nextOpenExercise(w: Pick<Workout, 'exercises'>, i: number) {
  const n = w.exercises.length;
  for (let k = 1; k < n; k++) {
    const j = (i + k) % n;
    if (!isExerciseDone(w.exercises[j])) return j;
  }
  return -1;
}

/** 걸린 시간(분). 1분보다 짧으면 1분. */
export const durationMinutes = (startedAt: number, now: number) => Math.max(1, Math.round((now - startedAt) / 60000));

/** 기록으로 옮긴다. 완료한 세트만 남기고, 하나도 안 한 종목은 뺀다. */
export function toSession(w: Workout, now: number, memo = ''): Omit<Session, 'id'> {
  const exercises = w.exercises
    .map((e) => ({ exerciseId: e.exerciseId, restSec: e.restSec, sets: e.sets.filter((s) => s.done) }))
    .filter((e) => e.sets.length > 0);
  const session: Omit<Session, 'id'> = { date: w.date, routineName: w.routineName, minutes: durationMinutes(w.startedAt, now), exercises };
  if (memo.trim()) session.memo = memo.trim();
  if (w.planId !== undefined) session.planId = w.planId;
  if (w.week !== undefined) session.week = w.week;
  return session;
}

/** 남은 쉬는 시간(초). 타이머가 없거나 끝났으면 0. */
export const restLeft = (w: Pick<Workout, 'rest'> | null | undefined, now: number) =>
  w?.rest ? Math.max(0, Math.ceil((w.rest.endsAt - now) / 1000)) : 0;
