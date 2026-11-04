import type { BodyWeight, Session, SetRecord } from '../db/types';
import { epley1RM, isReliableReps } from './oneRm';

/** 같은 무게끼리 묶어서 '70kg × 8 / 72.5kg × 8, 8, 8' */
export function setsSummary(sets: SetRecord[], unit = '회') {
  const groups: { weight: number; reps: number[] }[] = [];
  for (const s of sets) {
    const g = groups[groups.length - 1];
    if (g && g.weight === s.weight) g.reps.push(s.reps);
    else groups.push({ weight: s.weight, reps: [s.reps] });
  }
  return groups.map((g) => (g.weight ? `${g.weight}kg × ${g.reps.join(', ')}` : `${g.reps.join(', ')}${unit}`)).join(' / ');
}

/** 세트 중 가장 높은 추정 1RM. 무게가 없거나 12회가 넘는 세트는 빼고, 없으면 0. */
export function best1RM(sets: SetRecord[]) {
  return sets.reduce((best, s) => (s.weight > 0 && isReliableReps(s.reps) ? Math.max(best, epley1RM(s.weight, s.reps)) : best), 0);
}

/** 총 들어 올린 무게 (무게 x 횟수의 합) */
export const sessionVolume = (s: Session) => s.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + x.weight * x.reps, 0), 0);

export const sessionSets = (s: Session) => s.exercises.reduce((a, e) => a + e.sets.length, 0);

/** 가장 무거운 세트 */
export function topSet(s: Session): { exerciseId: string; weight: number } | null {
  let top: { exerciseId: string; weight: number } | null = null;
  for (const e of s.exercises) for (const x of e.sets) if (x.weight > (top?.weight ?? 0)) top = { exerciseId: e.exerciseId, weight: x.weight };
  return top;
}

const byDate = (a: Session, b: Session) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0);

export interface LiftPoint {
  date: string;
  oneRm: number;
}

/** 종목별 날짜순 추정 1RM (같은 날은 가장 높은 값) */
export function liftHistory(sessions: Session[]): Map<string, LiftPoint[]> {
  const out = new Map<string, LiftPoint[]>();
  for (const s of [...sessions].sort(byDate)) {
    for (const e of s.exercises) {
      const v = best1RM(e.sets);
      if (!v) continue;
      const list = out.get(e.exerciseId) ?? [];
      const last = list[list.length - 1];
      if (last?.date === s.date) last.oneRm = Math.max(last.oneRm, v);
      else list.push({ date: s.date, oneRm: v });
      out.set(e.exerciseId, list);
    }
  }
  return out;
}

export interface LiftSummary {
  exerciseId: string;
  best: number;
  first: number;
  /** 처음 대비 최고 기록이 오른 만큼 */
  gain: number;
  points: LiftPoint[];
}

/** 종목별 최고 1RM, 높은 순 */
export function liftSummaries(sessions: Session[]): LiftSummary[] {
  return [...liftHistory(sessions)]
    .map(([exerciseId, points]) => {
      const best = Math.max(...points.map((p) => p.oneRm));
      return { exerciseId, best, first: points[0].oneRm, gain: Math.round((best - points[0].oneRm) * 10) / 10, points };
    })
    .sort((a, b) => b.best - a.best);
}

/** 그때까지의 최고 1RM을 넘은 기록이 있는 운동. 세션 id → 운동 id. 첫 기록은 제외. */
export function personalRecords(sessions: Session[]): Map<number, string> {
  const best = new Map<string, number>();
  const out = new Map<number, string>();
  for (const s of [...sessions].sort(byDate)) {
    let pick: { id: string; gain: number } | null = null;
    for (const e of s.exercises) {
      const v = best1RM(e.sets);
      if (!v) continue;
      const prev = best.get(e.exerciseId);
      if (prev !== undefined && v > prev && (!pick || v - prev > pick.gain)) pick = { id: e.exerciseId, gain: v - prev };
      if (prev === undefined || v > prev) best.set(e.exerciseId, v);
    }
    if (pick && s.id !== undefined) out.set(s.id, pick.id);
  }
  return out;
}

/** 기간 안에 운동한 날 수 (하루에 두 번 해도 1) */
export function daysTrained(sessions: Session[], from: string, to: string) {
  return new Set(sessions.filter((s) => s.date >= from && s.date <= to).map((s) => s.date)).size;
}

/** 몸무게 처음과 마지막, 변화량 */
export function weightChange(list: BodyWeight[]) {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return { first, last, diff: Math.round((last.weight - first.weight) * 10) / 10 };
}

/** 분 → '10시간 48분' */
export function hoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`;
}
