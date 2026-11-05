import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BarbellDB } from '../src/db/schema';
import { finishWorkout, getWorkout, saveWorkout } from '../src/db/workoutRepo';
import {
  addCardio,
  cardioDone,
  cardioLeft,
  cardioOnlyWorkout,
  clockSeconds,
  durationMinutes,
  editSet,
  nextOpenExercise,
  nextSet,
  removeCardio,
  restLeft,
  setsLeft,
  toggleSet,
  toSession,
  updateCardio,
  weightStep,
  workoutFromDay,
} from '../src/lib/workout';
import type { Workout } from '../src/db/types';

const day = {
  planId: 1,
  week: 2,
  routineName: '상체 A',
  items: [
    { exerciseId: 'bench-press', sets: 3, reps: 8, weight: 60, restSec: 120 },
    { exerciseId: 'push-up', sets: 2, reps: 12, weight: 0, restSec: 75 },
  ],
};
const MIN = 60000;
const fresh = () => workoutFromDay(day, '2026-11-04', 1000);
const doAll = (w: Workout, ex: number) => w.exercises[ex].sets.reduce((acc, _, i) => toggleSet(acc, ex, i), w);

describe('workoutFromDay', () => {
  it('계획 무게와 횟수로 세트를 만든다', () => {
    const w = fresh();
    expect(w.exercises[0].sets).toEqual([
      { weight: 60, reps: 8, done: false },
      { weight: 60, reps: 8, done: false },
      { weight: 60, reps: 8, done: false },
    ]);
    expect(w).toMatchObject({ id: 'current', date: '2026-11-04', routineName: '상체 A', planId: 1, week: 2, startedAt: 1000 });
    expect(setsLeft(w)).toBe(5);
  });
});

describe('세트 체크와 고치기', () => {
  it('체크하면 다음 세트로 넘어가고, 원래 값은 바뀌지 않는다', () => {
    const w = fresh();
    const next = toggleSet(w, 0, 0);
    expect(nextSet(next.exercises[0])).toBe(1);
    expect(nextSet(w.exercises[0])).toBe(0);
    expect(nextSet(toggleSet(next, 0, 0).exercises[0])).toBe(0);
  });
  it('무게를 고치면 그 세트와 뒤에 남은 세트만 바뀐다', () => {
    const w = editSet(toggleSet(fresh(), 0, 0), 0, 1, { weight: 62.5 });
    expect(w.exercises[0].sets.map((s) => s.weight)).toEqual([60, 62.5, 62.5]);
    expect(w.exercises[1].sets.map((s) => s.weight)).toEqual([0, 0]);
  });
  it('끝난 종목 다음으로 남은 종목을 찾는다', () => {
    const w = doAll(fresh(), 0);
    expect(nextOpenExercise(w, 0)).toBe(1);
    expect(nextOpenExercise(fresh(), 1)).toBe(0);
    expect(nextOpenExercise(doAll(w, 1), 1)).toBe(-1);
  });
  it('무게 단위: 덤벨 1kg, 나머지 2.5kg', () => {
    expect(weightStep('덤벨')).toBe(1);
    expect(weightStep('바벨')).toBe(2.5);
  });
});

describe('시간 계산', () => {
  it('걸린 시간은 분 단위, 최소 1분', () => {
    expect(durationMinutes(0, 45 * MIN)).toBe(45);
    expect(durationMinutes(0, 20000)).toBe(1);
  });
  it('남은 쉬는 시간은 초 단위로 올림', () => {
    const rest = { endsAt: 10000, total: 90, label: '' };
    expect(restLeft({ rest }, 8500)).toBe(2);
    expect(restLeft({ rest }, 12000)).toBe(0);
    expect(restLeft(null, 0)).toBe(0);
  });
});

describe('toSession', () => {
  it('완료한 세트만 기록하고, 하나도 안 한 종목은 뺀다', () => {
    const w = toggleSet(toggleSet(fresh(), 0, 0), 0, 1);
    const s = toSession(w, 1000 + 50 * MIN, ' 좋음 ');
    expect(s).toMatchObject({ date: '2026-11-04', routineName: '상체 A', minutes: 50, memo: '좋음', planId: 1, week: 2 });
    expect(s.exercises).toHaveLength(1);
    expect(s.exercises[0].sets).toHaveLength(2);
  });
  it('메모가 비어 있으면 저장하지 않는다', () => {
    expect(toSession(doAll(fresh(), 0), 2000, '  ')).not.toHaveProperty('memo');
  });
});

describe('workoutRepo', () => {
  it('끝내면 기록으로 옮기고 진행 중인 운동을 지운다', async () => {
    const db = new BarbellDB('test-workout-1');
    await saveWorkout(doAll(fresh(), 0), db);
    expect((await getWorkout(db))?.routineName).toBe('상체 A');
    const id = await finishWorkout('가벼웠다', 1000 + 40 * MIN, db);
    expect(id).not.toBeNull();
    expect(await getWorkout(db)).toBeUndefined();
    expect(await db.sessions.get(id!)).toMatchObject({ minutes: 40, memo: '가벼웠다' });
  });
  it('완료한 세트가 없으면 기록 없이 지운다', async () => {
    const db = new BarbellDB('test-workout-2');
    await saveWorkout(fresh(), db);
    expect(await finishWorkout('', 5000, db)).toBeNull();
    expect(await getWorkout(db)).toBeUndefined();
    expect(await db.sessions.count()).toBe(0);
  });
});

describe('유산소', () => {
  const cardioDay = { ...day, cardio: [{ exerciseId: 'treadmill', minutes: 20, intensity: '보통' as const }] };
  const run = { exerciseId: 'running', minutes: 30, intensity: '힘들게' as const };

  it('계획의 유산소를 안 한 상태로 가져온다', () => {
    expect(workoutFromDay(cardioDay, '2026-11-04', 1000).cardio).toEqual([{ exerciseId: 'treadmill', minutes: 20, intensity: '보통', done: false }]);
    expect(fresh()).not.toHaveProperty('cardio');
  });
  it('유산소만 하는 날', () => {
    expect(cardioOnlyWorkout(run, '2026-11-04', 1000)).toMatchObject({ routineName: '유산소', exercises: [], cardio: [{ ...run, done: false }] });
  });
  it('추가, 고치기, 개수', () => {
    let w = addCardio(fresh(), run);
    w = addCardio(w, run);
    w = updateCardio(w, 0, { minutes: 25, done: true });
    expect(w.cardio![0]).toMatchObject({ minutes: 25, done: true });
    expect([cardioDone(w), cardioLeft(w)]).toEqual([1, 1]);
  });
  it('빼면 재던 시간도 맞춘다', () => {
    const w: Workout = { ...addCardio(addCardio(fresh(), run), run), cardioClock: { index: 1, startedAt: 5000 } };
    expect(removeCardio(w, 0).cardioClock).toEqual({ index: 0, startedAt: 5000 });
    expect(removeCardio(w, 1)).not.toHaveProperty('cardioClock');
    expect(removeCardio(w, 1).cardio).toHaveLength(1);
  });
  it('잰 시간(초)', () => {
    expect(clockSeconds({ cardioClock: { index: 0, startedAt: 1000 } }, 1000 + 95_500)).toBe(95);
    expect(clockSeconds({}, 5000)).toBe(0);
  });
  it('기록에는 끝낸 유산소만, 완료 표시 없이', () => {
    const w = updateCardio(addCardio(addCardio(fresh(), run), { ...run, exerciseId: 'walking' }), 1, { done: true });
    expect(toSession(w, 1000 + 30 * MIN).cardio).toEqual([{ exerciseId: 'walking', minutes: 30, intensity: '힘들게' }]);
    expect(toSession(fresh(), 2000)).not.toHaveProperty('cardio');
  });
  it('유산소만 끝내도 기록으로 남고, 안 했으면 남지 않는다', async () => {
    const db = new BarbellDB('test-workout-3');
    await saveWorkout(updateCardio(cardioOnlyWorkout(run, '2026-11-04', 1000), 0, { done: true }), db);
    const id = await finishWorkout('', 1000 + 31 * MIN, db);
    expect(await db.sessions.get(id!)).toMatchObject({ routineName: '유산소', exercises: [], cardio: [run], minutes: 31 });
    await saveWorkout(cardioOnlyWorkout(run, '2026-11-05', 1000), db);
    expect(await finishWorkout('', 5000, db)).toBeNull();
  });
});
