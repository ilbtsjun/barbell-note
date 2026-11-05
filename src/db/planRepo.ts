import { mondayOf, toISODate } from '../lib/dates';
import { generatePlan, type PlanInput } from '../lib/planGenerator';
import { db, type BarbellDB } from './schema';
import type { Plan, PlanDay, Profile, Weekday } from './types';

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
  return database.transaction('rw', [database.plans, database.planDays, database.profile, database.bodyWeights], async () => {
    await database.plans.toCollection().modify((p) => { p.active = false; });
    const planId = await database.plans.add(plan as Plan);
    await database.planDays.bulkAdd(days.map((d) => ({ ...d, planId }) as PlanDay));
    const prev = (await database.profile.get('me')) ?? DEFAULT_PROFILE;
    await database.profile.put({ ...prev, bodyWeight, goal: input.goal, days: input.days, equipment: input.equipment });
    await database.bodyWeights.put({ date: toISODate(new Date()), weight: bodyWeight }); // 몸무게 그래프의 첫 점
    return planId;
  });
}

export async function getActivePlan(database: BarbellDB = db): Promise<Plan | undefined> {
  return database.plans.filter((p) => p.active).last();
}

/**
 * 지금 계획을 고친다. 시작한 날은 그대로라 진행 중인 주차가 이어진다.
 * 이름과 활성 상태는 유지하고, 요일별 운동만 새로 만든다.
 */
export async function updatePlan(planId: number, input: PlanInput, bodyWeight: number, database: BarbellDB = db): Promise<void> {
  const old = await database.plans.get(planId);
  if (!old) throw new Error('계획을 찾을 수 없습니다');
  const exercises = await database.exercises.toArray();
  const { plan, days } = generatePlan({ ...input, startDate: old.startDate }, exercises);
  await database.transaction('rw', [database.plans, database.planDays, database.profile, database.bodyWeights], async () => {
    const next: Plan = { ...plan, id: planId, active: old.active };
    if (old.name) next.name = old.name;
    await database.plans.put(next);
    await database.planDays.where('planId').equals(planId).delete();
    await database.planDays.bulkAdd(days.map((d) => ({ ...d, planId }) as PlanDay));
    const prev = (await database.profile.get('me')) ?? DEFAULT_PROFILE;
    await database.profile.put({ ...prev, bodyWeight, goal: input.goal, days: input.days, equipment: input.equipment });
    await database.bodyWeights.put({ date: toISODate(new Date()), weight: bodyWeight });
  });
}

/** 저장해 둔 계획으로 바꾼다. 이번 주부터 1주차로 다시 시작한다. */
export async function activatePlan(planId: number, today = new Date(), database: BarbellDB = db): Promise<void> {
  await database.transaction('rw', [database.plans, database.planDays, database.profile], async () => {
    const plan = await database.plans.get(planId);
    if (!plan) throw new Error('계획을 찾을 수 없습니다');
    await database.plans.toCollection().modify((p) => { p.active = false; });
    await database.plans.update(planId, { active: true, startDate: mondayOf(today) });
    // 요일과 목표를 이 계획에 맞춘다 (계획을 다시 고칠 때 채워 넣는 값)
    const weekdays = plan.days ?? [...new Set((await database.planDays.where('planId').equals(planId).toArray()).filter((d) => d.week === 1).map((d) => d.weekday))];
    const prev = (await database.profile.get('me')) ?? DEFAULT_PROFILE;
    const next: Profile = { ...prev, days: weekdays as Weekday[] };
    if (plan.goal) next.goal = plan.goal;
    if (plan.equipment) next.equipment = plan.equipment;
    await database.profile.put(next);
  });
}

/** 계획 이름을 바꾼다. 비우면 시안 이름으로 돌아간다. */
export async function renamePlan(planId: number, name: string, database: BarbellDB = db) {
  const text = name.trim().slice(0, 30);
  await database.plans.update(planId, { name: text || undefined });
}

/** 저장해 둔 계획을 지운다. 지금 하는 계획은 지울 수 없다. 운동 기록은 남는다. */
export async function deletePlan(planId: number, database: BarbellDB = db) {
  await database.transaction('rw', [database.plans, database.planDays], async () => {
    const plan = await database.plans.get(planId);
    if (!plan) return;
    if (plan.active) throw new Error('지금 하는 계획은 지울 수 없습니다');
    await database.planDays.where('planId').equals(planId).delete();
    await database.plans.delete(planId);
  });
}

/** 내 정보(목표, 기구)를 고친다 */
export async function saveProfile(patch: Partial<Omit<Profile, 'id'>>, database: BarbellDB = db) {
  const prev = (await database.profile.get('me')) ?? DEFAULT_PROFILE;
  await database.profile.put({ ...prev, ...patch });
}
