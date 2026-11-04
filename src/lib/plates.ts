export const DEFAULT_BAR = 20;
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateResult {
  /** 한쪽에 끼울 원판 (무거운 것부터) */
  perSide: number[];
  /** 가진 원판으로 맞출 수 없어 남는 무게 (양쪽 합계) */
  remainder: number;
}

/** 목표 무게를 만들려면 봉 한쪽에 어떤 원판을 끼워야 하는지 계산한다. */
export function platesPerSide(total: number, bar = DEFAULT_BAR, plates = DEFAULT_PLATES): PlateResult {
  if (total <= bar) return { perSide: [], remainder: Math.max(0, total - bar) };
  let side = (total - bar) / 2;
  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (side >= p - 1e-9) {
      perSide.push(p);
      side -= p;
    }
  }
  return { perSide, remainder: Math.round(side * 2 * 100) / 100 };
}
