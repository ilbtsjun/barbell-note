import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE } from '../src/db/planRepo';
import { saveBodyWeight } from '../src/db/recordRepo';
import { BarbellDB } from '../src/db/schema';
import type { Session, SetRecord } from '../src/db/types';
import { addDays, monthCells, planDayDate } from '../src/lib/dates';
import {
  best1RM,
  daysTrained,
  hoursLabel,
  liftHistory,
  liftSummaries,
  personalRecords,
  sessionVolume,
  setsSummary,
  topSet,
  weightChange,
} from '../src/lib/stats';

const set = (weight: number, reps: number): SetRecord => ({ weight, reps, done: true });
const s1: Session = {
  id: 1, date: '2026-10-01', routineName: '상체 A', minutes: 50,
  exercises: [
    { exerciseId: 'bench-press', restSec: 120, sets: [set(60, 8), set(60, 8)] },
    { exerciseId: 'squat', restSec: 120, sets: [set(80, 5)] },
  ],
};
const s2: Session = {
  id: 2, date: '2026-10-05', routineName: '상체 A', minutes: 55,
  exercises: [
    { exerciseId: 'bench-press', restSec: 120, sets: [set(62.5, 8), set(65, 5)] },
    { exerciseId: 'squat', restSec: 120, sets: [set(80, 5)] },
  ],
};
// 15회는 오차가 커서 1RM 계산에서 뺀다
const s3: Session = { id: 3, date: '2026-10-05', routineName: '추가', minutes: 10, exercises: [{ exerciseId: 'bench-press', restSec: 60, sets: [set(50, 15)] }] };
const all = [s3, s1, s2];

describe('1RM 계산', () => {
  it('세트 중 가장 높은 추정 1RM', () => {
    expect(best1RM([set(62.5, 8), set(65, 5)])).toBe(79.2);
    expect(best1RM([set(50, 15), set(0, 10)])).toBe(0);
  });
  it('종목별 날짜순 기록 (같은 날은 높은 값)', () => {
    const h = liftHistory(all);
    expect(h.get('bench-press')).toEqual([{ date: '2026-10-01', oneRm: 76 }, { date: '2026-10-05', oneRm: 79.2 }]);
    expect(h.get('squat')).toHaveLength(2);
  });
  it('최고 1RM 높은 순, 처음 대비 상승', () => {
    const list = liftSummaries(all);
    expect(list.map((l) => l.exerciseId)).toEqual(['squat', 'bench-press']);
    expect(list[1]).toMatchObject({ best: 79.2, first: 76, gain: 3.2 });
    expect(list[0].gain).toBe(0);
  });
  it('최고 기록을 넘은 세션만 표시한다 (첫 기록 제외)', () => {
    const pr = personalRecords(all);
    expect([...pr]).toEqual([[2, 'bench-press']]);
  });
});

describe('세션 요약', () => {
  it('총 무게와 가장 무거운 세트', () => {
    expect(sessionVolume(s1)).toBe(1360);
    expect(topSet(s2)).toEqual({ exerciseId: 'squat', weight: 80 });
  });
  it('같은 무게끼리 묶어서 보여준다', () => {
    expect(setsSummary([set(60, 8), set(62.5, 8), set(62.5, 8)])).toBe('60kg × 8 / 62.5kg × 8, 8');
    expect(setsSummary([set(0, 12), set(0, 10)])).toBe('12, 10회');
  });
  it('기간 안에 운동한 날 수 (같은 날 두 번은 1)', () => {
    expect(daysTrained(all, '2026-10-01', '2026-10-05')).toBe(2);
    expect(daysTrained(all, '2026-10-02', '2026-10-04')).toBe(0);
  });
  it('시간 표시', () => {
    expect(hoursLabel(648)).toBe('10시간 48분');
    expect(hoursLabel(45)).toBe('45분');
    expect(hoursLabel(120)).toBe('2시간');
  });
});

describe('몸무게', () => {
  it('날짜순 처음과 마지막의 차이', () => {
    const c = weightChange([{ date: '2026-10-10', weight: 71 }, { date: '2026-10-01', weight: 72.4 }]);
    expect(c).toMatchObject({ first: { weight: 72.4 }, last: { weight: 71 }, diff: -1.4 });
    expect(weightChange([])).toBeNull();
  });
  it('같은 날은 덮어쓰고, 가장 최근 몸무게만 내 정보에 반영한다', async () => {
    const db = new BarbellDB('test-stats-1');
    await db.profile.put(DEFAULT_PROFILE);
    await saveBodyWeight('2026-11-04', 70.04, db);
    await saveBodyWeight('2026-11-04', 69.5, db);
    await saveBodyWeight('2026-11-01', 72, db);
    expect(await db.bodyWeights.count()).toBe(2);
    expect((await db.bodyWeights.get('2026-11-04'))?.weight).toBe(69.5);
    expect((await db.profile.get('me'))?.bodyWeight).toBe(69.5);
  });
});

describe('날짜', () => {
  it('날짜 더하기와 계획 날짜', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(planDayDate('2026-11-02', 1, 1)).toBe('2026-11-02');
    expect(planDayDate('2026-11-02', 2, 0)).toBe('2026-11-15');
  });
  it('달력은 월요일부터 (2026년 11월 1일은 일요일)', () => {
    const cells = monthCells(2026, 10);
    expect(cells).toHaveLength(36);
    expect(cells.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(cells[6]).toBe('2026-11-01');
  });
});
