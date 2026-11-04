import Dexie, { type Table } from 'dexie';
import type { BodyWeight, Exercise, Plan, PlanDay, Profile, Session, Workout } from './types';

/** 폰 안(IndexedDB)에 저장하는 바벨노트 데이터베이스 */
export class BarbellDB extends Dexie {
  profile!: Table<Profile, 'me'>;
  exercises!: Table<Exercise, string>;
  plans!: Table<Plan, number>;
  planDays!: Table<PlanDay, number>;
  sessions!: Table<Session, number>;
  bodyWeights!: Table<BodyWeight, string>;
  workout!: Table<Workout, 'current'>;

  constructor(name = 'barbell-note') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      exercises: 'id, part, equipment',
      plans: '++id',
      planDays: '++id, planId, [planId+week+weekday]',
      sessions: '++id, date',
      bodyWeights: 'date',
    });
    // 2: 진행 중인 운동 저장 (기존 데이터는 그대로)
    this.version(2).stores({ workout: 'id' });
  }
}

export const db = new BarbellDB();
