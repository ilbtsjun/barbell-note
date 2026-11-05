import type { CardioEntry, Equipment, Intensity, Session } from '../db/types';

export const INTENSITIES: Intensity[] = ['가볍게', '보통', '힘들게'];

/** 강도 설명 (말하기 기준이라 기구 없이도 맞출 수 있다) */
export const INTENSITY_HINT: Record<Intensity, string> = {
  가볍게: '노래를 부를 수 있는 정도',
  보통: '대화는 되지만 노래는 힘든 정도',
  힘들게: '몇 마디 말하기도 힘든 정도',
};

/**
 * 운동별 강도에 따른 MET (안정 시 대비 에너지 소비 배수).
 * 신체활동 개요표(Compendium of Physical Activities)의 값을 강도 세 단계로 묶었다.
 */
const MET: Record<string, [number, number, number]> = {
  walking: [2.8, 3.5, 4.8],
  running: [7.0, 9.0, 11.0],
  treadmill: [3.5, 7.0, 9.8],
  'stationary-bike': [3.5, 6.8, 8.8],
  'rowing-machine': [4.8, 7.0, 8.5],
  'stair-climber': [4.0, 6.5, 8.8],
  elliptical: [4.0, 5.0, 7.5],
  'jump-rope': [8.3, 11.0, 12.3],
  swimming: [5.8, 7.0, 9.8],
  'interval-run': [7.0, 9.0, 11.5],
};
const CARDIO_ORDER = Object.keys(MET);
/** 유산소 목록을 자주 하는 순서(걷기, 러닝, 트레드밀...)로. 직접 추가한 운동은 뒤에. */
export const byCardioOrder = (a: { id: string }, b: { id: string }) => {
  const i = (id: string) => (CARDIO_ORDER.includes(id) ? CARDIO_ORDER.indexOf(id) : CARDIO_ORDER.length);
  return i(a.id) - i(b.id);
};
const DEFAULT_MET: [number, number, number] = [3.5, 5.0, 7.0];

export const metFor = (exerciseId: string, intensity: Intensity) => (MET[exerciseId] ?? DEFAULT_MET)[INTENSITIES.indexOf(intensity)];

/** 추정 소모 칼로리 = MET x 몸무게(kg) x 시간(h) */
export const cardioKcal = (e: Pick<CardioEntry, 'exerciseId' | 'minutes' | 'intensity'>, bodyWeight: number) =>
  Math.round(metFor(e.exerciseId, e.intensity) * bodyWeight * (e.minutes / 60));

/** 주간 권장 150분에 세는 시간. 힘들게 한 시간은 2배로 친다 (세계보건기구 권고). */
export const creditMinutes = (e: Pick<CardioEntry, 'minutes' | 'intensity'>) => e.minutes * (e.intensity === '힘들게' ? 2 : 1);

export const WEEKLY_CARDIO_GOAL = 150;

export interface CardioWeek {
  minutes: number;
  credit: number;
  distanceKm: number;
  kcal: number;
  count: number;
}

/** 기간 안의 유산소 합계 */
export function cardioTotals(sessions: Session[], from: string, to: string, bodyWeight: number): CardioWeek {
  const out: CardioWeek = { minutes: 0, credit: 0, distanceKm: 0, kcal: 0, count: 0 };
  for (const s of sessions) {
    if (s.date < from || s.date > to) continue;
    for (const c of s.cardio ?? []) {
      out.minutes += c.minutes;
      out.credit += creditMinutes(c);
      out.distanceKm += c.distanceKm ?? 0;
      out.kcal += cardioKcal(c, bodyWeight);
      out.count++;
    }
  }
  out.distanceKm = Math.round(out.distanceKm * 10) / 10;
  return out;
}

/** '러닝 30분 · 4.2km' 같은 한 줄 요약에 쓰는 거리 표시 */
export const distanceLabel = (km?: number) => (km ? ` · ${Math.round(km * 100) / 100}km` : '');

/** 가진 기구로 할 수 있는 첫 유산소 (머신이 없으면 걷기나 러닝) */
export function pickCardio(options: string[], equipmentOf: (id: string) => Equipment | undefined, equipment: Equipment[]) {
  return options.find((id) => {
    const eq = equipmentOf(id);
    return eq === '맨몸' || (eq !== undefined && equipment.includes(eq));
  });
}
