import { useLiveQuery } from 'dexie-react-hooks';
import { getActivePlan } from './planRepo';
import { db } from './schema';

/** undefined = 아직 불러오는 중, null = 없음 */
export function useProfile() {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, []);
}

export function useActivePlan() {
  return useLiveQuery(async () => {
    const plan = await getActivePlan();
    if (!plan?.id) return null;
    const days = await db.planDays.where('planId').equals(plan.id).toArray();
    return { plan, days };
  }, []);
}

/** 모든 계획, 최근에 만든 것부터 */
export function usePlans() {
  return useLiveQuery(async () => (await db.plans.toArray()).sort((a, b) => (b.id ?? 0) - (a.id ?? 0)), []);
}

export function useExerciseMap() {
  return useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])), []);
}

/** 진행 중인 운동. undefined = 불러오는 중, null = 없음 */
export function useWorkout() {
  return useLiveQuery(async () => (await db.workout.get('current')) ?? null, []);
}

/** 그날 저장한 운동 기록 */
export function useSessionsOn(date: string) {
  return useLiveQuery(() => db.sessions.where('date').equals(date).toArray(), [date]);
}

/** 모든 운동 기록, 최근 것부터 */
export function useSessions() {
  return useLiveQuery(async () => (await db.sessions.toArray()).sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0)), []);
}

/** 몸무게 기록, 날짜순 */
export function useBodyWeights() {
  return useLiveQuery(() => db.bodyWeights.orderBy('date').toArray(), []);
}
