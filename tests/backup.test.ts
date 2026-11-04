import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { exportBackup, parseBackup, restoreBackup } from '../src/db/backup';
import { BarbellDB } from '../src/db/schema';
import { BASE_EXERCISES, seedExercises } from '../src/db/seed';

const session = (date: string, weight: number) => ({
  date, routineName: '상체 A', minutes: 50,
  exercises: [{ exerciseId: 'bench-press', restSec: 120, sets: [{ weight, reps: 8, done: true }] }],
});

describe('백업', () => {
  it('내려받은 백업으로 다른 기기 데이터를 그대로 되돌린다', async () => {
    const a = new BarbellDB('test-backup-a');
    await seedExercises(a);
    await a.sessions.add(session('2026-10-01', 60));
    await a.bodyWeights.put({ date: '2026-10-01', weight: 72 });
    const backup = parseBackup(JSON.stringify(await exportBackup(a, new Date('2026-11-04T00:00:00Z'))));
    expect(backup.exportedAt).toBe('2026-11-04T00:00:00.000Z');

    const b = new BarbellDB('test-backup-b');
    await seedExercises(b);
    await b.sessions.add(session('2026-11-01', 50));
    await b.sessions.add(session('2026-11-02', 50));
    await restoreBackup(backup, b);
    const sessions = await b.sessions.toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ date: '2026-10-01' });
    expect(await b.bodyWeights.count()).toBe(1);
    expect(await b.exercises.count()).toBe(BASE_EXERCISES.length);
  });

  it('바벨노트 백업이 아니면 이유를 알려준다', () => {
    expect(() => parseBackup('not json')).toThrow('읽을 수 없습니다');
    expect(() => parseBackup(JSON.stringify({ app: 'other', data: {} }))).toThrow('백업 파일이 아닙니다');
    expect(() => parseBackup(JSON.stringify({ app: 'barbell-note', version: 99, data: {} }))).toThrow('더 새로운 버전');
    expect(() => parseBackup(JSON.stringify({ app: 'barbell-note', version: 1, data: { sessions: 'x' } }))).toThrow('손상');
  });

  it('없는 항목은 빈 목록으로 채운다', () => {
    const b = parseBackup(JSON.stringify({ app: 'barbell-note', version: 1, exportedAt: '', data: { sessions: [] } }));
    expect(b.data.bodyWeights).toEqual([]);
    expect(b.data.workout).toEqual([]);
  });
});
