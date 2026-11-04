import exercisesData from '../data/exercises.ko.json';
import type { Exercise } from './types';
import { db, type BarbellDB } from './schema';

export const BASE_EXERCISES = exercisesData as Exercise[];

/**
 * 기본 운동 목록을 넣는다. 이미 있는 운동(사용자가 고친 것 포함)은 건드리지 않고,
 * 앱 업데이트로 새로 생긴 기본 운동만 추가한다.
 */
export async function seedExercises(database: BarbellDB = db): Promise<number> {
  const existing = new Set(await database.exercises.toCollection().primaryKeys());
  const missing = BASE_EXERCISES.filter((e) => !existing.has(e.id));
  if (missing.length) await database.exercises.bulkAdd(missing);
  return missing.length;
}
