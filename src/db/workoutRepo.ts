import { toSession } from '../lib/workout';
import { db, type BarbellDB } from './schema';
import type { Workout } from './types';

export const getWorkout = (database: BarbellDB = db) => database.workout.get('current');

/** 진행 중인 운동을 저장한다 (세트를 체크하거나 고칠 때마다). */
export async function saveWorkout(w: Workout, database: BarbellDB = db) {
  await database.workout.put(w);
}

/** 운동을 끝내고 기록으로 옮긴다. 완료한 세트가 없으면 기록 없이 지운다. 기록 id 또는 null. */
export async function finishWorkout(memo: string, now = Date.now(), database: BarbellDB = db): Promise<number | null> {
  return database.transaction('rw', [database.workout, database.sessions], async () => {
    const w = await database.workout.get('current');
    if (!w) return null;
    const session = toSession(w, now, memo);
    await database.workout.delete('current');
    if (!session.exercises.length) return null;
    return database.sessions.add(session);
  });
}

/** 기록하지 않고 진행 중인 운동을 버린다. */
export async function discardWorkout(database: BarbellDB = db) {
  await database.workout.delete('current');
}
