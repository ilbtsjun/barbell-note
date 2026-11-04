import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createPlan, getActivePlan } from '../src/db/planRepo';
import { BarbellDB } from '../src/db/schema';
import { seedExercises } from '../src/db/seed';

const input = {
  baseExerciseId: 'squat', baseWeight: 80, baseReps: 5, goal: '근비대' as const, weeks: 8,
  days: [2 as const, 4 as const], equipment: ['바벨' as const, '맨몸' as const], startDate: '2026-11-02',
};

describe('createPlan', () => {
  it('계획과 요일별 운동, 내 정보를 저장한다', async () => {
    const db = new BarbellDB('test-plan-1');
    await seedExercises(db);
    const id = await createPlan(input, 72.5, db);
    expect((await getActivePlan(db))?.id).toBe(id);
    expect(await db.planDays.where('planId').equals(id).count()).toBe(16);
    expect(await db.profile.get('me')).toMatchObject({ bodyWeight: 72.5, goal: '근비대', days: [2, 4] });
  });

  it('새로 만들면 이전 계획은 비활성이 된다', async () => {
    const db = new BarbellDB('test-plan-2');
    await seedExercises(db);
    const first = await createPlan(input, 72.5, db);
    const second = await createPlan({ ...input, baseWeight: 85 }, 72, db);
    expect((await db.plans.get(first))?.active).toBe(false);
    expect((await getActivePlan(db))?.id).toBe(second);
  });
});
