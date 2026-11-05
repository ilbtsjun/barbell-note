import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { activatePlan, createPlan, deletePlan, getActivePlan, renamePlan, saveProfile, updatePlan } from '../src/db/planRepo';
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

const fresh = async (name: string) => {
  const db = new BarbellDB(name);
  await seedExercises(db);
  return db;
};

describe('계획 관리', () => {
  it('만들 때 고른 목표, 요일, 기구를 계획에 남긴다', async () => {
    const db = await fresh('test-plan-3');
    const id = await createPlan({ ...input, days: [4, 2] }, 72.5, db);
    expect(await db.plans.get(id)).toMatchObject({ goal: '근비대', days: [2, 4], equipment: ['바벨', '맨몸'] });
  });

  it('고치면 같은 계획, 같은 시작일로 요일별 운동을 다시 만든다', async () => {
    const db = await fresh('test-plan-4');
    const id = await createPlan(input, 72.5, db);
    await renamePlan(id, '하체 집중', db);
    await updatePlan(id, { ...input, baseWeight: 90, days: [1, 3, 5], startDate: '2026-12-07' }, 73, db);
    expect(await db.plans.count()).toBe(1);
    expect(await db.plans.get(id)).toMatchObject({ active: true, startDate: '2026-11-02', baseWeight: 90, name: '하체 집중', days: [1, 3, 5] });
    expect(await db.planDays.where('planId').equals(id).count()).toBe(24);
    expect(await db.profile.get('me')).toMatchObject({ bodyWeight: 73, days: [1, 3, 5] });
  });

  it('저장한 계획으로 바꾸면 이번 주 월요일부터 1주차, 요일과 목표도 그 계획에 맞춘다', async () => {
    const db = await fresh('test-plan-5');
    const first = await createPlan(input, 72.5, db);
    const second = await createPlan({ ...input, goal: '근력', days: [1, 5] }, 72.5, db);
    await activatePlan(first, new Date(2026, 10, 19), db); // 11월 19일 목요일
    expect(await db.plans.get(first)).toMatchObject({ active: true, startDate: '2026-11-16' });
    expect((await db.plans.get(second))?.active).toBe(false);
    expect(await db.profile.get('me')).toMatchObject({ goal: '근비대', days: [2, 4] });
  });

  it('이름을 바꾸고, 비우면 이름을 없앤다', async () => {
    const db = await fresh('test-plan-6');
    const id = await createPlan(input, 72.5, db);
    await renamePlan(id, '  여름 준비  ', db);
    expect((await db.plans.get(id))?.name).toBe('여름 준비');
    await renamePlan(id, ' ', db);
    expect((await db.plans.get(id))?.name).toBeUndefined();
  });

  it('지금 하는 계획은 지울 수 없고, 저장한 계획은 요일별 운동까지 지운다', async () => {
    const db = await fresh('test-plan-7');
    const first = await createPlan(input, 72.5, db);
    const second = await createPlan(input, 72.5, db);
    await expect(deletePlan(second, db)).rejects.toThrow();
    await deletePlan(first, db);
    expect(await db.plans.get(first)).toBeUndefined();
    expect(await db.planDays.where('planId').equals(first).count()).toBe(0);
    expect(await db.planDays.where('planId').equals(second).count()).toBe(16);
  });

  it('내 정보가 없어도 고칠 수 있다', async () => {
    const db = await fresh('test-plan-8');
    await saveProfile({ goal: '체중 감량' }, db);
    expect(await db.profile.get('me')).toMatchObject({ goal: '체중 감량', bodyWeight: 70 });
  });
});
