import type { BodyPart, CustomDay, Equipment, Exercise, Weekday } from '../db/types';
import { weekdayLabel } from './dates';
import { josa } from './korean';

/** 직접 만든 계획의 시안 id */
export const CUSTOM_ID = 'custom';

/** 근력 부위 (유산소는 따로 고른다) */
export const STRENGTH_PARTS: BodyPart[] = ['가슴', '등', '하체', '어깨', '팔', '코어'];

/** 무리 방지 기준 */
export const LIMITS = {
  maxDays: 6,
  maxExercisesPerDay: 6,
  maxSetsPerDay: 24,
  maxSetsPerPartWeek: 20,
  minSets: 2,
  /** 주 5회 이상이면 처음 몇 주를 가볍게 시작할지와 그 비율 */
  easyStartWeeks: 2,
  easyStartScale: 0.9,
  maxCardioMinutes: 60,
};

/** 부위별로 먼저 고를 종목 (큰 근육을 쓰는 운동부터) */
const PRIORITY: Record<string, string[]> = {
  가슴: ['bench-press', 'dumbbell-bench-press', 'incline-dumbbell-press', 'chest-press-machine', 'cable-crossover', 'dumbbell-fly', 'push-up', 'dips'],
  등: ['barbell-row', 'lat-pulldown', 'seated-cable-row', 'one-arm-dumbbell-row', 'pull-up', 'chin-up', 't-bar-row', 'back-extension'],
  하체: ['squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'goblet-squat', 'lunge', 'bulgarian-split-squat', 'leg-extension', 'calf-raise', 'bodyweight-squat'],
  어깨: ['overhead-press', 'dumbbell-shoulder-press', 'shoulder-press-machine', 'lateral-raise', 'face-pull', 'rear-delt-fly'],
  팔: ['barbell-curl', 'cable-pushdown', 'dumbbell-curl', 'overhead-triceps-extension', 'hammer-curl', 'bench-dip'],
  코어: ['plank', 'hanging-leg-raise', 'crunch', 'ab-wheel', 'russian-twist', 'side-plank'],
};

const usable = (e: Exercise, equipment: Equipment[]) => e.equipment === '맨몸' || equipment.includes(e.equipment);

/** 부위별 후보 (우선순위 순, 그다음 나머지) */
export function candidatesFor(part: BodyPart, exercises: Exercise[], equipment: Equipment[]) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const first = (PRIORITY[part] ?? []).map((id) => byId.get(id)).filter((e): e is Exercise => !!e && usable(e, equipment));
  const rest = exercises.filter((e) => e.part === part && usable(e, equipment) && !first.includes(e));
  return [...first, ...rest];
}

/** 고른 부위에 맞춰 종목을 채운다. 부위가 많을수록 부위당 종목을 줄여 하루 6종목을 넘지 않게 한다. */
export function autoExercises(parts: BodyPart[], exercises: Exercise[], equipment: Equipment[]) {
  const strength = parts.filter((p) => p !== '유산소');
  if (!strength.length) return [];
  const per = Math.max(1, Math.min(4, Math.floor(LIMITS.maxExercisesPerDay / strength.length)));
  const out: string[] = [];
  for (const p of strength) {
    for (const e of candidatesFor(p, exercises, equipment).slice(0, per)) {
      if (out.length < LIMITS.maxExercisesPerDay && !out.includes(e.id)) out.push(e.id);
    }
  }
  return out;
}

/** 루틴 이름: '가슴·등', 유산소가 있으면 '·유산소' */
export function customRoutineName(day: Pick<CustomDay, 'exercises' | 'cardio'>, byId: Map<string, Exercise>) {
  const parts: string[] = [];
  for (const id of day.exercises) {
    const p = byId.get(id)?.part;
    if (p && !parts.includes(p)) parts.push(p);
  }
  if (day.cardio) parts.push('유산소');
  return parts.join('·') || '자유 운동';
}

const order = (d: Weekday) => (d === 0 ? 7 : d);
/** 바로 전날 (월요일의 전날은 일요일) */
const prevDay = (d: Weekday): Weekday => ((d + 6) % 7) as Weekday;

export interface CustomItem {
  exerciseId: string;
  main: boolean;
  sets: number;
}

export interface CustomVolume {
  /** 요일별 종목과 세트 수 */
  days: { weekday: Weekday; items: CustomItem[] }[];
  /** 처음 몇 주 무게 비율 (주 5회 이상이면 0.9) */
  startScale: number;
  /** 무리 점검: 자동으로 조정한 것과 확인할 것 */
  notes: string[];
  /** 고쳐야 저장할 수 있는 문제 */
  errors: string[];
}

/**
 * 직접 만든 계획의 세트 수를 정하고 무리한 부분을 고친다.
 * 1. 기본: 부위의 첫 종목은 주 운동 4세트, 나머지 3세트. 주 5회 이상이면 3/2세트.
 * 2. 전날과 같은 부위면 그 부위 세트를 1씩 줄인다.
 * 3. 하루 24세트, 부위별 한 주 20세트를 넘으면 보조 종목부터 줄인다.
 */
export function planCustomVolume(days: CustomDay[], byId: Map<string, Exercise>): CustomVolume {
  const notes: string[] = [];
  const errors: string[] = [];
  const sorted = [...days].sort((a, b) => order(a.weekday) - order(b.weekday));
  const many = sorted.length >= 5;
  if (sorted.length > LIMITS.maxDays) errors.push(`주 ${LIMITS.maxDays}회까지 고를 수 있습니다. 하루는 쉬어야 회복됩니다.`);
  if (many) notes.push(`주 ${sorted.length}회라 종목당 세트를 1씩 줄이고, 처음 ${LIMITS.easyStartWeeks}주는 무게를 ${LIMITS.easyStartScale * 100}%로 시작합니다.`);

  const partsOf = (d: CustomDay) => new Set(d.exercises.map((id) => byId.get(id)?.part).filter((p): p is BodyPart => !!p));
  const partsByDay = new Map(sorted.map((d) => [d.weekday, partsOf(d)]));

  const out = sorted.map((d) => {
    if (!d.exercises.length && !d.cardio) errors.push(`${weekdayLabel(d.weekday)}요일에 할 운동을 고르세요.`);
    if (d.exercises.length > LIMITS.maxExercisesPerDay) errors.push(`${weekdayLabel(d.weekday)}요일은 ${d.exercises.length}종목입니다. 하루 ${LIMITS.maxExercisesPerDay}종목까지 넣을 수 있습니다.`);
    if (d.cardio && d.cardio.minutes > LIMITS.maxCardioMinutes) errors.push(`${weekdayLabel(d.weekday)}요일 유산소는 ${LIMITS.maxCardioMinutes}분까지 넣을 수 있습니다.`);

    const seen = new Set<BodyPart>();
    const yesterday = partsByDay.get(prevDay(d.weekday));
    const repeated = new Set<BodyPart>();
    const items: CustomItem[] = d.exercises.map((id) => {
      const part = byId.get(id)?.part as BodyPart;
      const main = !seen.has(part) && part !== '코어';
      seen.add(part);
      let sets = main ? (many ? 3 : 4) : many ? 2 : 3;
      if (yesterday?.has(part) && part !== '코어') {
        repeated.add(part);
        sets = Math.max(LIMITS.minSets, sets - 1);
      }
      return { exerciseId: id, main, sets };
    });
    if (repeated.size) {
      notes.push(`${josa([...repeated].join(', '), '을')} ${weekdayLabel(prevDay(d.weekday))}·${weekdayLabel(d.weekday)} 이틀 연속 합니다. ${weekdayLabel(d.weekday)}요일 세트를 줄였습니다. 하루 이상 쉬는 것이 좋습니다.`);
    }

    // 하루 세트 상한
    const total = () => items.reduce((a, i) => a + i.sets, 0);
    if (total() > LIMITS.maxSetsPerDay) {
      const before = total();
      trim(items, () => total() > LIMITS.maxSetsPerDay);
      notes.push(`${weekdayLabel(d.weekday)}요일이 ${before}세트라 ${total()}세트로 줄였습니다.`);
    }
    return { weekday: d.weekday, items };
  });

  // 부위별 한 주 세트 상한 (코어 제외)
  for (const part of STRENGTH_PARTS) {
    if (part === '코어') continue;
    const mine = out.flatMap((d) => d.items.filter((i) => byId.get(i.exerciseId)?.part === part));
    const sum = () => mine.reduce((a, i) => a + i.sets, 0);
    const before = sum();
    if (before > LIMITS.maxSetsPerPartWeek) {
      trim(mine, () => sum() > LIMITS.maxSetsPerPartWeek);
      notes.push(`${josa(part, '이')} 한 주 ${before}세트라 ${sum()}세트로 줄였습니다.${sum() > LIMITS.maxSetsPerPartWeek ? ' 종목이나 요일을 줄이는 것이 좋습니다.' : ''}`);
    }
  }

  return { days: out, startScale: many ? LIMITS.easyStartScale : 1, notes, errors };
}

/** 보조 종목의 세트를 뒤에서부터 1씩 줄이고, 그래도 넘으면 주 운동도 줄인다 (최소 2세트). */
function trim(items: CustomItem[], over: () => boolean) {
  for (const pickMain of [false, true]) {
    let changed = true;
    while (over() && changed) {
      changed = false;
      for (let i = items.length - 1; i >= 0 && over(); i--) {
        if (items[i].main === pickMain && items[i].sets > LIMITS.minSets) {
          items[i].sets--;
          changed = true;
        }
      }
    }
  }
}
