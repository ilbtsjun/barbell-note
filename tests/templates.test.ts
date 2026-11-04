import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES } from '../src/db/seed';
import { generatePlan, type PlanInput } from '../src/lib/planGenerator';
import { recommendTemplates, TEMPLATES } from '../src/lib/templates';

const GYM = ['바벨', '덤벨', '머신', '케이블', '맨몸'] as PlanInput['equipment'];

// 벤치 60kg x 8회 = 1RM 76kg
const input: PlanInput = {
  baseExerciseId: 'bench-press',
  baseWeight: 60,
  baseReps: 8,
  goal: '근력',
  weeks: 12,
  days: [1, 3, 5],
  equipment: GYM,
  startDate: '2026-11-02',
};
const ids = new Set(BASE_EXERCISES.map((e) => e.id));
const byId = new Map(BASE_EXERCISES.map((e) => [e.id, e]));

describe('TEMPLATES', () => {
  it('시안 7개, id가 겹치지 않는다', () => {
    expect(TEMPLATES).toHaveLength(7);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(7);
  });
  it('후보 운동은 모두 기본 운동 목록에 있다', () => {
    for (const t of TEMPLATES) for (const r of t.routines) for (const s of r.slots) for (const id of s.options) expect(ids.has(id), `${t.id}: ${id}`).toBe(true);
  });
  it('모든 시안이 가능한 횟수마다 빈 날 없이 계획을 만든다', () => {
    for (const t of TEMPLATES) {
      for (const n of t.sessions) {
        const days = ([1, 2, 3, 4, 5, 6, 0] as const).slice(0, n);
        const { days: out } = generatePlan({ ...input, days: [...days], templateId: t.id }, BASE_EXERCISES);
        expect(out).toHaveLength(12 * n);
        for (const d of out) expect(d.items.length, `${t.id} ${d.routineName}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('시안별 계획', () => {
  it('처음 시작 전신: A/B를 주를 넘겨 번갈아 하고, 세트 수와 무게를 낮춘다', () => {
    const { days } = generatePlan({ ...input, templateId: 'starter-3' }, BASE_EXERCISES);
    expect(days.slice(0, 6).map((d) => d.routineName)).toEqual(['전신 A', '전신 B', '전신 A', '전신 B', '전신 A', '전신 B']);
    const [squat, bench] = days[0].items;
    // 1주차 예상 1RM 77, 스쿼트 = 76 x 1.3 x 77/76 = 100.1 -> x 0.70 x 0.9 = 63.1 -> 62.5
    expect(squat).toMatchObject({ exerciseId: 'squat', sets: 3, reps: 8, weight: 62.5 });
    // 벤치(보조) = 77 x 0.65 x 0.9 = 45.0 -> 45
    expect(bench).toMatchObject({ exerciseId: 'bench-press', sets: 2, reps: 10, weight: 45, restSec: 90 });
  });

  it('밀기·당기기·하체 주 6회는 두 바퀴 돈다', () => {
    const { days } = generatePlan({ ...input, goal: '근비대', templateId: 'ppl', days: [1, 2, 3, 4, 5, 6] }, BASE_EXERCISES);
    expect(days.slice(0, 6).map((d) => d.routineName)).toEqual(['밀기', '당기기', '하체', '밀기', '당기기', '하체']);
  });

  it('덤벨 홈트는 기구가 다 있어도 덤벨과 맨몸 운동만 쓴다', () => {
    const { days } = generatePlan({ ...input, templateId: 'dumbbell-home' }, BASE_EXERCISES);
    for (const d of days) for (const i of d.items) expect(['덤벨', '맨몸']).toContain(byId.get(i.exerciseId)!.equipment);
  });

  it('체중 감량 서킷: 주 운동도 12회 고정, 짧게 쉰다', () => {
    const { days } = generatePlan({ ...input, goal: '체중 감량', templateId: 'fat-loss-circuit' }, BASE_EXERCISES);
    // 목표 76 x 1.05 = 79.8 -> 80, 1주차 예상 1RM 76.3
    // 고블릿 스쿼트 = 76 x 0.4 x 76.3/76 = 30.5 -> x 0.6 = 18.3 -> 18 (덤벨 1kg 단위)
    expect(days[0].items[0]).toMatchObject({ exerciseId: 'goblet-squat', sets: 3, reps: 12, weight: 18, restSec: 45 });
    const plank = days[0].items.find((i) => i.exerciseId === 'plank')!;
    expect(plank).toMatchObject({ reps: 30, weight: 0 });
    expect(days[0].items.find((i) => i.exerciseId === 'push-up')).toMatchObject({ reps: 15, restSec: 45 });
  });

  it('시안을 고르지 않으면 기본 3분할', () => {
    expect(generatePlan(input, BASE_EXERCISES).plan.templateId).toBe('basic-3');
  });
});

describe('recommendTemplates', () => {
  const rec = (...a: Parameters<typeof recommendTemplates>) => recommendTemplates(...a).map((t) => t.id);
  it('헬스장 + 근력', () => expect(rec('근력', GYM)).toEqual(['basic-3', 'upper-lower-4', 'full-2']));
  it('헬스장 + 근비대', () => expect(rec('근비대', GYM)).toEqual(['ppl', 'basic-3', 'upper-lower-4']));
  it('헬스장 + 체중 감량', () => expect(rec('체중 감량', GYM)).toEqual(['fat-loss-circuit', 'full-2', 'starter-3']));
  it('덤벨만 있으면 홈트가 먼저', () => expect(rec('근력', ['덤벨', '맨몸'])[0]).toBe('dumbbell-home'));
  it('덤벨이 없으면 홈트는 빠진다', () => expect(rec('근력', ['맨몸'], 7)).not.toContain('dumbbell-home'));
});
