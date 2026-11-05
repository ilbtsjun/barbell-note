import { describe, expect, it } from 'vitest';
import type { Equipment, Session } from '../src/db/types';
import { cardioKcal, cardioTotals, creditMinutes, distanceLabel, pickCardio } from '../src/lib/cardio';

describe('cardioKcal', () => {
  it('MET x 몸무게 x 시간', () => {
    // 러닝 보통 9 MET x 70kg x 0.5시간
    expect(cardioKcal({ exerciseId: 'running', minutes: 30, intensity: '보통' }, 70)).toBe(315);
    // 걷기 가볍게 2.8 x 70 x 1
    expect(cardioKcal({ exerciseId: 'walking', minutes: 60, intensity: '가볍게' }, 70)).toBe(196);
  });
  it('모르는 운동은 기본값(보통 5 MET)', () => {
    expect(cardioKcal({ exerciseId: 'custom-1', minutes: 60, intensity: '보통' }, 60)).toBe(300);
  });
});

describe('creditMinutes', () => {
  it('힘들게 한 시간은 2배', () => {
    expect(creditMinutes({ minutes: 20, intensity: '힘들게' })).toBe(40);
    expect(creditMinutes({ minutes: 30, intensity: '보통' })).toBe(30);
  });
});

describe('cardioTotals', () => {
  const s = (date: string, cardio: Session['cardio']): Session => ({ date, routineName: '유산소', minutes: 30, exercises: [], cardio });
  const sessions = [
    s('2026-11-02', [{ exerciseId: 'running', minutes: 30, intensity: '보통', distanceKm: 5 }]),
    s('2026-11-04', [
      { exerciseId: 'walking', minutes: 40, intensity: '가볍게' },
      { exerciseId: 'jump-rope', minutes: 20, intensity: '힘들게' },
    ]),
    { date: '2026-11-05', routineName: '하체', minutes: 50, exercises: [] },
    s('2026-11-10', [{ exerciseId: 'running', minutes: 30, intensity: '보통' }]),
  ];
  it('기간 안의 유산소만 더한다', () => {
    // kcal: 315 + 2.8x70x40/60(131) + 12.3x70x20/60(287)
    expect(cardioTotals(sessions, '2026-11-02', '2026-11-08', 70)).toEqual({ minutes: 90, credit: 110, distanceKm: 5, kcal: 733, count: 3 });
  });
  it('없으면 0', () => {
    expect(cardioTotals(sessions, '2026-10-01', '2026-10-31', 70)).toEqual({ minutes: 0, credit: 0, distanceKm: 0, kcal: 0, count: 0 });
  });
});

describe('pickCardio', () => {
  const eq: Record<string, Equipment> = { treadmill: '머신', walking: '맨몸' };
  it('가진 기구로 할 수 있는 첫 운동', () => {
    expect(pickCardio(['treadmill', 'walking'], (id) => eq[id], ['머신'])).toBe('treadmill');
    expect(pickCardio(['treadmill', 'walking'], (id) => eq[id], ['덤벨'])).toBe('walking');
  });
});

describe('distanceLabel', () => {
  it('거리가 있을 때만', () => {
    expect(distanceLabel(4.256)).toBe(' · 4.26km');
    expect(distanceLabel()).toBe('');
  });
});
