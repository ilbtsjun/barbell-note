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
