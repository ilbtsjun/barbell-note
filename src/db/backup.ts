import { db, type BarbellDB } from './schema';
import { seedExercises } from './seed';
import type { BodyWeight, Exercise, Plan, PlanDay, Profile, Session, Workout } from './types';

export const BACKUP_APP = 'barbell-note';
export const BACKUP_VERSION = 1;

export interface BackupData {
  profile: Profile[];
  exercises: Exercise[];
  plans: Plan[];
  planDays: PlanDay[];
  sessions: Session[];
  bodyWeights: BodyWeight[];
  workout: Workout[];
}

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: BackupData;
}

const TABLES = ['profile', 'exercises', 'plans', 'planDays', 'sessions', 'bodyWeights', 'workout'] as const;

/** 폰 안의 모든 데이터를 백업 파일 내용으로 만든다. */
export async function exportBackup(database: BarbellDB = db, now = new Date()): Promise<Backup> {
  const data: Record<string, unknown[]> = {};
  await database.transaction('r', TABLES.map((t) => database[t]), async () => {
    for (const t of TABLES) data[t] = await database[t].toArray();
  });
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data: data as unknown as BackupData };
}

/** 백업 파일 내용을 검사한다. 바벨노트 백업이 아니면 이유를 담은 오류를 던진다. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('백업 파일을 읽을 수 없습니다. 바벨노트에서 내려받은 파일인지 확인하세요.');
  }
  const b = raw as Partial<Backup>;
  if (!b || b.app !== BACKUP_APP || typeof b.data !== 'object' || !b.data) throw new Error('바벨노트 백업 파일이 아닙니다.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) throw new Error('더 새로운 버전의 앱에서 만든 백업입니다. 앱을 업데이트한 뒤 다시 시도하세요.');
  const data = b.data as unknown as Record<string, unknown>;
  for (const t of TABLES) {
    const v = data[t];
    if (v === undefined) data[t] = [];
    else if (!Array.isArray(v)) throw new Error('백업 파일이 손상되었습니다.');
  }
  return b as Backup;
}

/** 지금 데이터를 모두 지우고 백업으로 되돌린다. 빠진 기본 운동은 다시 채운다. */
export async function restoreBackup(backup: Backup, database: BarbellDB = db) {
  await database.transaction('rw', TABLES.map((t) => database[t]), async () => {
    for (const t of TABLES) {
      await database[t].clear();
      const rows = backup.data[t] as unknown[];
      if (rows.length) await (database[t] as unknown as { bulkPut: (r: unknown[]) => Promise<unknown> }).bulkPut(rows);
    }
  });
  await seedExercises(database);
}

/** 백업 요약: '운동 12번, 몸무게 8개' */
export function backupSummary(b: Backup) {
  return `운동 기록 ${b.data.sessions.length}개, 몸무게 ${b.data.bodyWeights.length}개`;
}
