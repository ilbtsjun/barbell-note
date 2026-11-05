import type { CustomDay, Equipment, Exercise, Goal, Plan, PlanDay, PlannedCardio, PlannedExercise, Weekday } from '../db/types';
import { pickCardio } from './cardio';
import { CUSTOM_ID, customRoutineName, LIMITS, planCustomVolume } from './customPlan';
import { epley1RM, round1, roundTo } from './oneRm';
import { estimate1RMFor } from './strengthRatios';
import { getTemplate, isHold, STANDARD, type Slot, type TemplateStyle } from './templates';

/** 12주 기준 목표별 1RM 상승률 (기간에 비례) */
export const GOAL_RATE: Record<Goal, number> = { 근력: 0.15, 근비대: 0.1, '체중 감량': 0.05 };

export const BASE_LIFTS = ['bench-press', 'squat', 'deadlift', 'overhead-press'] as const;

export interface PlanInput {
  baseExerciseId: string;
  baseWeight: number;
  baseReps: number;
  goal: Goal;
  weeks: number;
  days: Weekday[];
  equipment: Equipment[];
  /** 'YYYY-MM-DD' 계획 시작 주의 월요일 */
  startDate: string;
  /** 계획 시안 (없으면 기본 3분할). 직접 만들면 'custom' */
  templateId?: string;
  /** 직접 만든 계획의 요일별 구성 */
  custom?: CustomDay[];
}

/** 하루 루틴: 종목(세트 수 포함)과 유산소 */
interface DaySpec {
  name: string;
  items: { id: string; main: boolean; sets: number }[];
  cardio?: PlannedCardio[];
}

/** 직접 만든 계획의 횟수와 쉬는 시간 (세트 수는 planCustomVolume이 정한다) */
const CUSTOM_STYLE: TemplateStyle = { ...STANDARD };

export interface WeekLoad {
  week: number;
  /** 그 주의 예상 1RM */
  est1RM: number;
  pct: number;
  reps: number;
  weight: number;
  deload: boolean;
}

export function targetFor(current1RM: number, goal: Goal, weeks: number) {
  return roundTo(current1RM * (1 + GOAL_RATE[goal] * (weeks / 12)), 2.5);
}

/**
 * 주차별 작업 무게. 예상 1RM을 현재에서 목표까지 곧게 올리고,
 * 1~4주 8회(70% 내외), 5~8주 6회(75% 내외), 9주 이후 4회(82% 내외), 4주마다 회복 주(62%, 8회).
 */
export const isDeloadWeek = (week: number, weeks: number) => week % 4 === 0 && week !== weeks;

export function weeklyLoads(current1RM: number, target1RM: number, weeks: number, step = 2.5): WeekLoad[] {
  const out: WeekLoad[] = [];
  for (let week = 1; week <= weeks; week++) {
    const deload = isDeloadWeek(week, weeks);
    const est1RM = current1RM + (target1RM - current1RM) * (week / weeks);
    const phase = week <= 4 ? 0 : week <= 8 ? 1 : 2;
    const pct = deload ? 0.62 : [0.7, 0.75, 0.82][phase] + ((week - 1) % 4) * 0.01;
    const reps = deload ? 8 : [8, 6, 4][phase];
    out.push({ week, est1RM: round1(est1RM), pct, reps, weight: roundTo(est1RM * pct, step), deload });
  }
  return out;
}

function pick(slot: Slot, byId: Map<string, Exercise>, equipment: Equipment[], used: Set<string>) {
  const ok = (id: string) => {
    const e = byId.get(id);
    return !!e && !used.has(id) && (e.equipment === '맨몸' || equipment.includes(e.equipment));
  };
  return slot.options.find(ok) ?? null;
}

const stepFor = (e: Exercise) => (e.equipment === '덤벨' ? 1 : 2.5);

/** 월요일부터 순서대로 정렬 (일요일은 맨 뒤) */
const weekOrder = (d: Weekday) => (d === 0 ? 7 : d);

/** 입력한 기록과 고른 시안으로 계획 전체(주차 x 요일 x 종목)를 만든다. 순수 함수라 저장은 하지 않는다. */
export function generatePlan(input: PlanInput, exercises: Exercise[]): { plan: Omit<Plan, 'id'>; days: Omit<PlanDay, 'id' | 'planId'>[] } {
  const custom = input.templateId === CUSTOM_ID && input.custom?.length ? input.custom : null;
  const template = getTemplate(input.templateId);
  const style: TemplateStyle = custom ? CUSTOM_STYLE : template.style;
  const equipment = !custom && template.only ? input.equipment.filter((e) => template.only!.includes(e)) : input.equipment;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const start1RM = epley1RM(input.baseWeight, input.baseReps);
  const target1RM = targetFor(start1RM, input.goal, input.weeks);
  const loads = weeklyLoads(start1RM, target1RM, input.weeks);

  // 요일별로 할 루틴 (매주 같은 종목으로 진행)
  let weekdays: Weekday[];
  let routineFor: (weekday: Weekday, session: number) => DaySpec;
  let startScale = 1;
  if (custom) {
    const volume = planCustomVolume(custom, byId);
    startScale = volume.startScale;
    const specs = new Map(
      volume.days.map((d) => {
        const src = custom.find((c) => c.weekday === d.weekday)!;
        return [d.weekday, { name: customRoutineName(src, byId), items: d.items.map((i) => ({ id: i.exerciseId, main: i.main, sets: i.sets })), cardio: src.cardio ? [src.cardio] : undefined }];
      }),
    );
    weekdays = volume.days.map((d) => d.weekday);
    routineFor = (weekday) => specs.get(weekday)!;
  } else {
    const chosen: DaySpec[] = template.routines.map((r) => {
      const used = new Set<string>();
      const items = r.slots
        .map((slot) => {
          const id = pick(slot, byId, equipment, used);
          if (id) used.add(id);
          return id ? { id, main: !!slot.main, sets: slot.main ? style.mainSets : style.accSets } : null;
        })
        .filter((x): x is DaySpec['items'][number] => !!x);
      const cardioId = r.cardio && pickCardio(r.cardio.options, (id) => byId.get(id)?.equipment, equipment);
      return { name: r.name, items, cardio: cardioId && r.cardio ? [{ exerciseId: cardioId, minutes: r.cardio.minutes, intensity: r.cardio.intensity }] : undefined };
    });
    weekdays = [...input.days].sort((a, b) => weekOrder(a) - weekOrder(b));
    routineFor = (_weekday, session) => chosen[session % chosen.length]; // 주가 바뀌어도 이어서 돌린다 (A B A / B A B)
  }
  const scale = style.loadScale ?? 1;

  const out: Omit<PlanDay, 'id' | 'planId'>[] = [];
  let session = 0;
  for (const load of loads) {
    const progress = load.est1RM / start1RM; // 기준 운동이 오른 만큼 다른 운동도 같이 올린다
    const weekScale = scale * (load.week <= LIMITS.easyStartWeeks ? startScale : 1);
    for (const weekday of weekdays) {
      const routine = routineFor(weekday, session++);
      const items: PlannedExercise[] = routine.items.map(({ id, main, sets }) => {
        const e = byId.get(id)!;
        const isBase = id === input.baseExerciseId;
        const est = (isBase ? load.est1RM : estimate1RMFor(id, input.baseExerciseId, start1RM) * progress) * weekScale;
        const weightAt = (pct: number) => (est ? roundTo(est * pct, stepFor(e)) : 0);
        if (main) {
          const reps = style.mainReps ?? load.reps;
          const pct = style.mainPct !== undefined ? style.mainPct - (load.deload ? 0.1 : 0) : load.pct;
          return { exerciseId: id, sets, reps, weight: weightAt(pct), restSec: style.mainRestSec ?? (reps <= 4 ? 150 : 120) };
        }
        const reps = isHold(id) ? 30 : e.equipment === '맨몸' ? Math.max(style.accReps, 12) : style.accReps;
        return { exerciseId: id, sets, reps, weight: weightAt(load.deload ? 0.55 : 0.65), restSec: style.accRestSec };
      });
      const day: Omit<PlanDay, 'id' | 'planId'> = { week: load.week, weekday, routineName: routine.name, items };
      if (routine.cardio?.length) day.cardio = routine.cardio.map((c) => ({ ...c }));
      out.push(day);
    }
  }

  const plan: Omit<Plan, 'id'> = {
    baseExerciseId: input.baseExerciseId,
    baseWeight: input.baseWeight,
    baseReps: input.baseReps,
    start1RM,
    target1RM,
    weeks: input.weeks,
    startDate: input.startDate,
    active: true,
    templateId: custom ? CUSTOM_ID : template.id,
    goal: input.goal,
    days: weekdays,
    equipment: input.equipment,
  };
  if (custom) plan.custom = custom;
  return { plan, days: out };
}

/**
 * 계획 화면의 주차별 표에 쓸 대표 운동과 주차별 처방.
 * 기준 운동이 계획에 있으면 그 운동, 없으면 첫 루틴의 주 운동.
 */
export function progressSeries(days: Pick<PlanDay, 'week' | 'items'>[], baseExerciseId: string) {
  const all = days.flatMap((d) => d.items);
  const exerciseId = all.some((i) => i.exerciseId === baseExerciseId) ? baseExerciseId : days[0]?.items[0]?.exerciseId ?? baseExerciseId;
  const rows = new Map<number, PlannedExercise>();
  for (const d of days) {
    const item = d.items.find((i) => i.exerciseId === exerciseId);
    if (item && !rows.has(d.week)) rows.set(d.week, item);
  }
  return { exerciseId, rows };
}
