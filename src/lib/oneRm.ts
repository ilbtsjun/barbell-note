/** 소수점 첫째 자리까지 반올림 */
export const round1 = (x: number) => Math.round(x * 10) / 10;

/** 무게를 step 단위로 반올림 (바벨/머신 2.5kg, 덤벨 1kg 등) */
export const roundTo = (x: number, step: number) => Math.round(x / step) * step;

/**
 * Epley 공식으로 추정 1RM(한 번에 들 수 있는 최대 무게)을 구한다.
 * 1회면 그 무게가 곧 1RM이다.
 */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return round1(weight * (1 + reps / 30));
}

/** 12회를 넘으면 오차가 커서 참고용으로만 보여준다. */
export const isReliableReps = (reps: number) => reps >= 1 && reps <= 12;
