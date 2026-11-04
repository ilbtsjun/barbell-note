const DOW = ['일', '월', '화', '수', '목', '금', '토'] as const;

export const weekdayLabel = (d: number) => DOW[d];

/** 2026-11-04 → '11월 4일 수요일' */
export function koreanDate(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${DOW[date.getDay()]}요일`;
}

/** Date → 'YYYY-MM-DD' (기기 현지 시간 기준) */
export function toISODate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
