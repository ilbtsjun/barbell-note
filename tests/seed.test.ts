import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BarbellDB } from '../src/db/schema';
import { BASE_EXERCISES, seedExercises } from '../src/db/seed';

describe('seedExercises', () => {
  it('처음 실행하면 기본 운동을 모두 넣는다', async () => {
    const db = new BarbellDB('test-seed-1');
    expect(await seedExercises(db)).toBe(BASE_EXERCISES.length);
    expect(await db.exercises.count()).toBe(BASE_EXERCISES.length);
  });

  it('다시 실행해도 중복으로 넣지 않고, 사용자가 추가한 운동은 남긴다', async () => {
    const db = new BarbellDB('test-seed-2');
    await seedExercises(db);
    await db.exercises.add({ id: 'custom-1', name: '스미스 머신 스쿼트', part: '하체', equipment: '머신', barbell: false, steps: [], custom: true });
    expect(await seedExercises(db)).toBe(0);
    expect(await db.exercises.count()).toBe(BASE_EXERCISES.length + 1);
  });

  it('기본 운동 데이터는 id가 겹치지 않고 설명이 3단계씩 있다', () => {
    const ids = new Set(BASE_EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(BASE_EXERCISES.length);
    for (const e of BASE_EXERCISES) expect(e.steps).toHaveLength(3);
  });
});
