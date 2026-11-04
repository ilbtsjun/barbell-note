import type { Equipment, Goal } from '../db/types';

/** 한 종목 자리. 앞에 올수록 먼저 고르는 후보 (없는 기구면 다음 후보). */
export interface Slot {
  options: string[];
  /** 주차별 진행(8→6→4회)을 따르는 주 운동 */
  main?: boolean;
}

export interface Routine {
  name: string;
  slots: Slot[];
}

/** 세트, 횟수, 쉬는 시간 규칙 */
export interface TemplateStyle {
  mainSets: number;
  accSets: number;
  accReps: number;
  accRestSec: number;
  /** 주 운동 횟수를 고정하면 주차별 8→6→4 대신 이 값을 쓴다 */
  mainReps?: number;
  /** 주 운동 무게 비율을 고정 (회복 주는 0.1 낮춤) */
  mainPct?: number;
  mainRestSec?: number;
  /** 처음 시작하는 사람용으로 전체 무게를 낮춘다 (0.9 = 90%) */
  loadScale?: number;
}

export interface PlanTemplate {
  id: string;
  name: string;
  summary: string;
  /** 가능한 주당 운동 횟수 (첫 값이 기본) */
  sessions: number[];
  goals: Goal[];
  /** 이 기구들 중 하나라도 있어야 제대로 돌아간다 (빈 배열이면 제한 없음) */
  needs: Equipment[];
  /** 이 기구만 쓴다 (홈트) */
  only?: Equipment[];
  routines: Routine[];
  style: TemplateStyle;
}

const main = (...options: string[]): Slot => ({ options, main: true });
const acc = (...options: string[]): Slot => ({ options });
const R = (name: string, ...slots: Slot[]): Routine => ({ name, slots });

const STANDARD: TemplateStyle = { mainSets: 4, accSets: 3, accReps: 10, accRestSec: 75 };

// 자주 쓰는 루틴
const LOWER = R('하체', main('squat', 'leg-press', 'goblet-squat', 'bodyweight-squat'), acc('romanian-deadlift', 'leg-curl', 'bulgarian-split-squat'), acc('leg-press', 'lunge', 'bodyweight-squat'), acc('leg-curl', 'hip-thrust'), acc('hanging-leg-raise', 'crunch'));
const LOWER_B = R('하체 B', main('deadlift', 'romanian-deadlift', 'hip-thrust'), acc('front-squat', 'hack-squat', 'goblet-squat'), acc('lunge', 'bulgarian-split-squat'), acc('calf-raise'), acc('ab-wheel', 'crunch'));
const UPPER_A = R('상체 A', main('bench-press', 'dumbbell-bench-press', 'chest-press-machine', 'push-up'), acc('barbell-row', 'one-arm-dumbbell-row', 'seated-cable-row'), acc('overhead-press', 'dumbbell-shoulder-press', 'shoulder-press-machine'), acc('lat-pulldown', 'pull-up'), acc('dumbbell-curl', 'barbell-curl'));
const UPPER_B = R('상체 B', main('overhead-press', 'dumbbell-shoulder-press', 'shoulder-press-machine'), acc('lat-pulldown', 'pull-up', 'chin-up'), acc('incline-dumbbell-press', 'incline-bench-press', 'push-up'), acc('seated-cable-row', 'one-arm-dumbbell-row'), acc('cable-pushdown', 'overhead-triceps-extension', 'bench-dip'));

export const TEMPLATES: PlanTemplate[] = [
  {
    id: 'basic-3',
    name: '기본 3분할',
    summary: '하체, 상체 둘로 나눠 근력을 고르게 올리는 기본형',
    sessions: [3],
    goals: ['근력', '근비대'],
    needs: [],
    routines: [LOWER, UPPER_A, UPPER_B],
    style: STANDARD,
  },
  {
    id: 'upper-lower-4',
    name: '상하체 4분할',
    summary: '주 4회, 근력과 근육량을 함께 키우는 구성',
    sessions: [4],
    goals: ['근력', '근비대'],
    needs: [],
    routines: [UPPER_A, { ...LOWER, name: '하체 A' }, UPPER_B, LOWER_B],
    style: STANDARD,
  },
  {
    id: 'full-2',
    name: '바쁜 주 2회 전신',
    summary: '시간이 없을 때, 큰 운동 위주로 하루 4종목',
    sessions: [2],
    goals: ['근력', '근비대', '체중 감량'],
    needs: [],
    routines: [
      R('전신 A', main('squat', 'leg-press', 'goblet-squat'), acc('bench-press', 'dumbbell-bench-press', 'push-up'), acc('barbell-row', 'one-arm-dumbbell-row'), acc('crunch', 'hanging-leg-raise')),
      R('전신 B', main('deadlift', 'romanian-deadlift'), acc('overhead-press', 'dumbbell-shoulder-press'), acc('lat-pulldown', 'pull-up'), acc('lunge', 'bulgarian-split-squat')),
    ],
    style: STANDARD,
  },
  {
    id: 'starter-3',
    name: '처음 시작 전신',
    summary: '운동을 처음 시작할 때, 하루 3종목에 가벼운 무게부터',
    sessions: [3],
    goals: ['근력', '근비대', '체중 감량'],
    needs: [],
    routines: [
      R('전신 A', main('squat', 'leg-press', 'goblet-squat', 'bodyweight-squat'), acc('bench-press', 'chest-press-machine', 'dumbbell-bench-press', 'push-up'), acc('lat-pulldown', 'one-arm-dumbbell-row', 'chin-up')),
      R('전신 B', main('deadlift', 'romanian-deadlift', 'hip-thrust'), acc('overhead-press', 'shoulder-press-machine', 'dumbbell-shoulder-press'), acc('seated-cable-row', 'barbell-row', 'one-arm-dumbbell-row')),
    ],
    style: { mainSets: 3, accSets: 2, accReps: 10, accRestSec: 90, loadScale: 0.9 },
  },
  {
    id: 'ppl',
    name: '밀기·당기기·하체',
    summary: '근육량 위주, 부위별로 종목을 많이 하는 구성',
    sessions: [3, 6],
    goals: ['근비대'],
    needs: [],
    routines: [
      R('밀기', main('bench-press', 'dumbbell-bench-press', 'chest-press-machine'), acc('overhead-press', 'dumbbell-shoulder-press', 'shoulder-press-machine'), acc('incline-dumbbell-press', 'cable-crossover', 'push-up'), acc('lateral-raise', 'cable-lateral-raise'), acc('cable-pushdown', 'overhead-triceps-extension', 'dips')),
      R('당기기', main('barbell-row', 'one-arm-dumbbell-row', 'seated-cable-row'), acc('lat-pulldown', 'pull-up'), acc('seated-cable-row', 't-bar-row', 'one-arm-dumbbell-row'), acc('face-pull', 'rear-delt-fly'), acc('barbell-curl', 'dumbbell-curl'), acc('hammer-curl', 'preacher-curl')),
      R('하체', main('squat', 'leg-press', 'goblet-squat'), acc('romanian-deadlift', 'leg-curl'), acc('leg-press', 'bulgarian-split-squat', 'lunge'), acc('leg-extension', 'lunge'), acc('calf-raise'), acc('hanging-leg-raise', 'crunch')),
    ],
    style: { mainSets: 4, accSets: 3, accReps: 12, accRestSec: 60 },
  },
  {
    id: 'dumbbell-home',
    name: '덤벨 홈트',
    summary: '헬스장 없이 덤벨과 맨몸만으로 하는 전신 운동',
    sessions: [3],
    goals: ['근력', '근비대', '체중 감량'],
    needs: ['덤벨'],
    only: ['덤벨', '맨몸'],
    routines: [
      R('전신 A', main('goblet-squat', 'bodyweight-squat'), acc('dumbbell-bench-press', 'push-up'), acc('one-arm-dumbbell-row'), acc('lateral-raise'), acc('plank', 'crunch')),
      R('전신 B', main('dumbbell-shoulder-press'), acc('bulgarian-split-squat', 'lunge'), acc('one-arm-dumbbell-row', 'chin-up'), acc('dumbbell-curl', 'hammer-curl'), acc('russian-twist', 'crunch')),
      R('전신 C', main('dumbbell-bench-press', 'push-up'), acc('lunge', 'goblet-squat'), acc('rear-delt-fly'), acc('overhead-triceps-extension', 'bench-dip'), acc('side-plank', 'crunch')),
    ],
    style: { mainSets: 4, accSets: 3, accReps: 12, accRestSec: 60 },
  },
  {
    id: 'fat-loss-circuit',
    name: '체중 감량 서킷',
    summary: '전신 위주, 12~15회에 짧게 쉬며 칼로리를 많이 쓰는 구성',
    sessions: [3, 4],
    goals: ['체중 감량'],
    needs: [],
    routines: [
      R('서킷 A', main('goblet-squat', 'squat', 'bodyweight-squat'), acc('push-up', 'dumbbell-bench-press'), acc('one-arm-dumbbell-row', 'seated-cable-row'), acc('lunge', 'bodyweight-squat'), acc('plank', 'crunch')),
      R('서킷 B', main('romanian-deadlift', 'hip-thrust'), acc('dumbbell-shoulder-press', 'shoulder-press-machine'), acc('lat-pulldown', 'chin-up'), acc('bulgarian-split-squat', 'lunge'), acc('russian-twist', 'crunch')),
    ],
    style: { mainSets: 3, mainReps: 12, mainPct: 0.6, mainRestSec: 45, accSets: 3, accReps: 15, accRestSec: 45 },
  },
];

export const getTemplate = (id?: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

/** 횟수 대신 버티는 시간(초)으로 하는 운동 */
const HOLDS = new Set(['plank', 'side-plank']);
export const isHold = (exerciseId: string) => HOLDS.has(exerciseId);

/** '주 3회 또는 6회' */
export const sessionsLabel = (t: PlanTemplate) => `주 ${t.sessions.join('회 또는 ')}회`;

/** 하루 종목 수 '4~5종목' */
export function exerciseCountLabel(t: PlanTemplate) {
  const n = t.routines.map((r) => r.slots.length);
  const lo = Math.min(...n);
  const hi = Math.max(...n);
  return lo === hi ? `${lo}종목` : `${lo}~${hi}종목`;
}

/** 기본 요일 (월요일부터) */
export const DEFAULT_DAYS: Record<number, (0 | 1 | 2 | 3 | 4 | 5 | 6)[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
};

/** 목표와 기구에 맞는 시안을 점수순으로 고른다. */
export function recommendTemplates(goal: Goal, equipment: Equipment[], limit = 3): PlanTemplate[] {
  const gym = equipment.includes('바벨') || equipment.includes('머신');
  const score = (t: PlanTemplate) => {
    if (t.needs.length && !t.needs.some((n) => equipment.includes(n))) return -1;
    let s = t.goals.includes(goal) ? 3 : 0;
    if (t.goals.length === 1 && t.goals[0] === goal) s += 2; // 그 목표 전용
    if (t.only) s += gym ? -2 : 3; // 홈트는 헬스장 기구가 없을 때 위로
    if (t.id === 'basic-3') s += 1; // 무난한 기본형
    return s;
  };
  return TEMPLATES.map((t) => [t, score(t)] as const)
    .filter(([, s]) => s >= 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}
