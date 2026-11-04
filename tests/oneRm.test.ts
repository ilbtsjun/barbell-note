import { describe, expect, it } from 'vitest';
import { epley1RM, isReliableReps, roundTo } from '../src/lib/oneRm';

describe('epley1RM', () => {
  it('60kg x 8회 → 76kg', () => expect(epley1RM(60, 8)).toBe(76));
  it('1회면 그 무게가 1RM', () => expect(epley1RM(100, 1)).toBe(100));
  it('잘못된 값이면 0', () => {
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(50, 0)).toBe(0);
  });
  it('12회 초과는 참고용', () => {
    expect(isReliableReps(12)).toBe(true);
    expect(isReliableReps(13)).toBe(false);
  });
  it('2.5kg 단위 반올림', () => {
    expect(roundTo(61.4, 2.5)).toBe(62.5);
    expect(roundTo(61.2, 2.5)).toBe(60);
  });
});
