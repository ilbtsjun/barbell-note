import { describe, expect, it } from 'vitest';
import { platesPerSide } from '../src/lib/plates';

describe('platesPerSide', () => {
  it('62.5kg → 한쪽 20 + 1.25', () => expect(platesPerSide(62.5)).toEqual({ perSide: [20, 1.25], remainder: 0 }));
  it('100kg → 한쪽 25 + 15', () => expect(platesPerSide(100)).toEqual({ perSide: [25, 15], remainder: 0 }));
  it('봉 무게 이하면 원판 없음', () => expect(platesPerSide(20).perSide).toEqual([]));
  it('가진 원판으로 못 맞추면 남는 무게를 알려준다', () => {
    const r = platesPerSide(61, 20, [20, 10, 5]);
    expect(r.perSide).toEqual([20]);
    expect(r.remainder).toBe(1);
  });
});
