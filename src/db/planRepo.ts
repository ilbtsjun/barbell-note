import { generatePlan, type PlanInput } from '../lib/planGenerator';
import { db, type BarbellDB } from './schema';
import type { Plan, PlanDay, Profile } from './types';

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  bodyWeight: 70,
  goal: '근력',
  days: [1, 3, 5],
  equipment: ['바벨', '덤벨', '머신', '케이블'],
  barWeight: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
};

/** 입력으로 새 계획을 만들어 저장한다. 이전 계획은 비활성으로 남겨 기록과 함께 보존한다. */
export async function createPlan(input: PlanInput, bodyWeight: number, database: BarbellDB = db): Promise<number> {
  const exercises = await database.exercises.toArray();
  const { plan, days } = generatePlan(input, exercises);
  return database.transaction('rw', [database.plans, database.planDays, database.profile], async () => {
    await database.plans.toCollection().modify((p) => { p.active = false; });
    const planId = await database.plans.add(plan as Plan);
    await database.planDays.bulkAdd(days.map((d) => ({ ...d, planId }) as PlanDay));
    const prev = (await database.profile.get('me')) ?? DEFAULT_PROFILE;
    await database.profile.put({ ...prev, bodyWeight, goal: input.goal, days: input.days, equipment: input.equipment });
    return planId;
  });
}

export async function getActivePlan(database: BarbellDB = db): Promise<Plan | undefined> {
  return database.plans.filter((p) => p.active).last();
}
