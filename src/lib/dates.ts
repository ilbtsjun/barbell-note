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

/** 그 주의 월요일 'YYYY-MM-DD' */
export function mondayOf(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return toISODate(d);
}

/** 'YYYY-MM-DD' → 현지 자정 Date */
export function fromISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 계획 시작일(월요일) 기준 오늘이 몇 주차인지. 시작 전이면 1. */
export function weekNumber(startDate: string, today = new Date()) {
  const start = fromISODate(startDate).getTime();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(1, Math.floor(Math.round((t - start) / 86400000) / 7) + 1);
}
