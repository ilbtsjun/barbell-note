import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES } from '../src/db/seed';
import { generatePlan, progressSeries, targetFor, weeklyLoads, type PlanInput } from '../src/lib/planGenerator';

const input: PlanInput = {
  baseExerciseId: 'bench-press',
  baseWeight: 60,
  baseReps: 8,
  goal: '근력',
  weeks: 12,
  days: [5, 1, 3],
  equipment: ['바벨', '덤벨', '머신', '케이블', '맨몸'],
  startDate: '2026-11-02',
};

describe('targetFor', () => {
  it('근력 12주 = 15% 상승, 2.5kg 단위', () => expect(targetFor(76, '근력', 12)).toBe(87.5));
  it('기간에 비례', () => expect(targetFor(100, '근비대', 6)).toBe(105));
});

describe('weeklyLoads', () => {
  const loads = weeklyLoads(76, 87.5, 12);
  it('주 수만큼 만든다', () => expect(loads).toHaveLength(12));
  it('4, 8주는 회복 주, 마지막 주는 아님', () => {
    expect(loads.filter((l) => l.deload).map((l) => l.week)).toEqual([4, 8]);
  });
  it('구간별 횟수 8 → 6 → 4', () => {
    expect(loads[0].reps).toBe(8);
    expect(loads[4].reps).toBe(6);
    expect(loads[8].reps).toBe(4);
  });
  it('무게는 2.5kg 단위', () => loads.forEach((l) => expect((l.weight / 2.5) % 1).toBe(0)));
  it('마지막 주 예상 1RM = 목표', () => expect(loads[11].est1RM).toBe(87.5));
});

describe('generatePlan', () => {
  const { plan, days } = generatePlan(input, BASE_EXERCISES);
  it('1RM과 목표를 저장한다', () => {
    expect(plan.start1RM).toBe(76);
    expect(plan.target1RM).toBe(87.5);
  });
  it('주차 x 요일만큼 날을 만든다, 요일은 월요일부터 순서대로', () => {
    expect(days).toHaveLength(36);
    expect(days.slice(0, 3).map((d) => [d.weekday, d.routineName])).toEqual([[1, '하체'], [3, '상체 A'], [5, '상체 B']]);
  });
  it('기준 운동은 주차별 작업 무게를 그대로 쓴다', () => {
    const w1 = days.find((d) => d.week === 1 && d.routineName === '상체 A')!;
    const bench = w1.items.find((i) => i.exerciseId === 'bench-press')!;
    expect(bench).toMatchObject({ sets: 4, reps: 8, weight: 55 });
  });
  it('바벨이 없으면 덤벨/머신 운동으로 바꾼다', () => {
    const { days: noBar } = generatePlan({ ...input, equipment: ['덤벨', '머신', '맨몸'] }, BASE_EXERCISES);
    const ids = noBar.flatMap((d) => d.items.map((i) => i.exerciseId));
    const barbellIds = new Set(BASE_EXERCISES.filter((e) => e.equipment === '바벨').map((e) => e.id));
    expect(ids.some((id) => barbellIds.has(id))).toBe(false);
  });
  it('하루 안에 같은 운동이 두 번 나오지 않는다', () => {
    for (const d of days) expect(new Set(d.items.map((i) => i.exerciseId)).size).toBe(d.items.length);
  });
});

describe('progressSeries', () => {
  it('기준 운동이 계획에 있으면 그 운동의 주차별 처방', () => {
    const { days } = generatePlan(input, BASE_EXERCISES);
    const { exerciseId, rows } = progressSeries(days, 'bench-press');
    expect(exerciseId).toBe('bench-press');
    expect(rows.size).toBe(12);
    expect(rows.get(1)).toMatchObject({ sets: 4, reps: 8, weight: 55 });
  });
  it('기준 운동이 없으면 첫 루틴의 주 운동', () => {
    const { days } = generatePlan({ ...input, templateId: 'fat-loss-circuit', goal: '체중 감량' }, BASE_EXERCISES);
    expect(progressSeries(days, 'bench-press').exerciseId).toBe('goblet-squat');
  });
});
