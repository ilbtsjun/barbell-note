import { db, type BarbellDB } from './schema';

/** 그날 몸무게를 저장한다 (같은 날이면 덮어쓴다). 내 정보의 몸무게도 같이 바꾼다. */
export async function saveBodyWeight(date: string, weight: number, database: BarbellDB = db) {
  const value = Math.round(weight * 10) / 10;
  await database.transaction('rw', [database.bodyWeights, database.profile], async () => {
    await database.bodyWeights.put({ date, weight: value });
    const latest = await database.bodyWeights.orderBy('date').last();
    if (latest?.date === date) await database.profile.update('me', { bodyWeight: value });
  });
}

export async function updateSessionMemo(id: number, memo: string, database: BarbellDB = db) {
  const text = memo.trim();
  await database.sessions.update(id, { memo: text || undefined });
}

export async function deleteSession(id: number, database: BarbellDB = db) {
  await database.sessions.delete(id);
}
