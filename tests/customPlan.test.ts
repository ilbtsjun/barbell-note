import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES } from '../src/db/seed';
import type { CustomDay, Equipment } from '../src/db/types';
import { autoExercises, customRoutineName, planCustomVolume } from '../src/lib/customPlan';
import { generatePlan, type PlanInput } from '../src/lib/planGenerator';

const GYM: Equipment[] = ['바벨', '덤벨', '머신', '케이블', '맨몸'];
const byId = new Map(BASE_EXERCISES.map((e) => [e.id, e]));
const day = (weekday: CustomDay['weekday'], exercises: string[], extra: Partial<CustomDay> = {}): CustomDay => ({ weekday, parts: [], exercises, ...extra });
const setsOf = (v: ReturnType<typeof planCustomVolume>, weekday: number) => v.days.find((d) => d.weekday === weekday)!.items.map((i) => i.sets);

describe('autoExercises', () => {
  it('부위 하나면 큰 운동부터 4종목', () => {
    expect(autoExercises(['가슴'], BASE_EXERCISES, GYM)).toEqual(['bench-press', 'dumbbell-bench-press', 'incline-dumbbell-press', 'chest-press-machine']);
  });
  it('부위 셋이면 부위당 2종목, 하루 6종목', () => {
    expect(autoExercises(['하체', '가슴', '등'], BASE_EXERCISES, GYM)).toEqual(['squat', 'romanian-deadlift', 'bench-press', 'dumbbell-bench-press', 'barbell-row', 'lat-pulldown']);
  });
  it('부위 여섯이면 부위당 1종목', () => {
    expect(autoExercises(['가슴', '등', '하체', '어깨', '팔', '코어'], BASE_EXERCISES, GYM)).toEqual(['bench-press', 'barbell-row', 'squat', 'overhead-press', 'barbell-curl', 'plank']);
  });
  it('가진 기구로 할 수 있는 운동만', () => {
    expect(autoExercises(['가슴'], BASE_EXERCISES, ['맨몸'])).toEqual(['push-up', 'dips']);
  });
  it('유산소만 고르면 근력 종목은 없다', () => {
    expect(autoExercises(['유산소'], BASE_EXERCISES, GYM)).toEqual([]);
  });
});

describe('customRoutineName', () => {
  it('종목의 부위 순서대로, 유산소는 끝에', () => {
    expect(customRoutineName({ exercises: ['bench-press', 'barbell-row', 'push-up'], cardio: { exerciseId: 'treadmill', minutes: 20, intensity: '보통' } }, byId)).toBe('가슴·등·유산소');
  });
  it('아무것도 없으면 자유 운동', () => expect(customRoutineName({ exercises: [] }, byId)).toBe('자유 운동'));
});

describe('planCustomVolume', () => {
  it('부위의 첫 종목은 4세트, 나머지는 3세트, 고칠 것이 없으면 메모도 없다', () => {
    const v = planCustomVolume([day(1, ['bench-press', 'dumbbell-bench-press']), day(3, ['bench-press', 'dumbbell-bench-press'])], byId);
    expect(setsOf(v, 1)).toEqual([4, 3]);
    expect(setsOf(v, 3)).toEqual([4, 3]);
    expect(v.days[0].items.map((i) => i.main)).toEqual([true, false]);
    expect(v).toMatchObject({ startScale: 1, notes: [], errors: [] });
  });

  it('코어는 주 운동으로 치지 않는다', () => {
    const v = planCustomVolume([day(1, ['plank', 'crunch'])], byId);
    expect(v.days[0].items).toEqual([
      { exerciseId: 'plank', main: false, sets: 3 },
      { exerciseId: 'crunch', main: false, sets: 3 },
    ]);
  });

  it('전날과 같은 부위면 다음 날 세트를 1씩 줄이고 알려준다', () => {
    const v = planCustomVolume([day(1, ['bench-press', 'dumbbell-bench-press']), day(2, ['bench-press', 'dumbbell-bench-press'])], byId);
    expect(setsOf(v, 1)).toEqual([4, 3]);
    expect(setsOf(v, 2)).toEqual([3, 2]);
    expect(v.notes).toHaveLength(1);
    expect(v.notes[0]).toContain('가슴을 월·화 이틀 연속');
  });

  it('일요일 다음 월요일도 연속으로 본다', () => {
    const v = planCustomVolume([day(1, ['squat']), day(0, ['squat'])], byId);
    expect(setsOf(v, 0)).toEqual([4]);
    expect(setsOf(v, 1)).toEqual([3]);
  });

  it('부위별 한 주 20세트를 넘으면 보조 종목부터 줄인다', () => {
    const chest = ['bench-press', 'dumbbell-bench-press', 'incline-dumbbell-press'];
    const v = planCustomVolume([day(1, chest), day(3, chest), day(5, chest)], byId);
    // 하루 4+3+3 = 10, 한 주 30 -> 보조를 모두 2로(24), 주 운동을 뒤에서부터 줄여 20
    expect(setsOf(v, 1)).toEqual([3, 2, 2]);
    expect(setsOf(v, 3)).toEqual([3, 2, 2]);
    expect(setsOf(v, 5)).toEqual([2, 2, 2]);
    expect(v.notes).toEqual(['가슴이 한 주 30세트라 20세트로 줄였습니다.']);
  });

  it('하루 24세트를 넘으면 줄이고, 6종목이 넘으면 저장할 수 없다', () => {
    const v = planCustomVolume([day(1, ['bench-press', 'barbell-row', 'squat', 'overhead-press', 'barbell-curl', 'plank', 'dumbbell-bench-press'])], byId);
    // 4+4+4+4+4+3(코어)+3(가슴 보조) = 26 -> 뒤에서부터 보조 2개를 1씩
    expect(setsOf(v, 1)).toEqual([4, 4, 4, 4, 4, 2, 2]);
    expect(v.notes).toContain('월요일이 26세트라 24세트로 줄였습니다.');
    expect(v.errors).toContain('월요일은 7종목입니다. 하루 6종목까지 넣을 수 있습니다.');
  });

  it('주 5회 이상이면 세트를 줄이고 처음 2주는 90%로 시작한다', () => {
    const v = planCustomVolume(
      [day(1, ['bench-press', 'dumbbell-bench-press']), day(2, ['barbell-row']), day(3, ['squat']), day(4, ['overhead-press']), day(5, ['barbell-curl'])],
      byId,
    );
    expect(setsOf(v, 1)).toEqual([3, 2]);
    expect(setsOf(v, 2)).toEqual([3]);
    expect(v.startScale).toBe(0.9);
    expect(v.notes).toHaveLength(1);
    expect(v.notes[0]).toContain('주 5회');
  });

  it('고쳐야 하는 문제: 주 7회, 빈 요일, 유산소 60분 초과', () => {
    const week = ([1, 2, 3, 4, 5, 6, 0] as const).map((d) => day(d, ['plank']));
    expect(planCustomVolume(week, byId).errors).toContain('주 6회까지 고를 수 있습니다. 하루는 쉬어야 회복됩니다.');
    expect(planCustomVolume([day(2, [])], byId).errors).toEqual(['화요일에 할 운동을 고르세요.']);
    const cardio = (minutes: number) => planCustomVolume([day(2, [], { cardio: { exerciseId: 'running', minutes, intensity: '보통' } })], byId).errors;
    expect(cardio(30)).toEqual([]);
    expect(cardio(70)).toEqual(['화요일 유산소는 60분까지 넣을 수 있습니다.']);
  });
});

describe('generatePlan 직접 만든 계획', () => {
  const custom = [day(1, ['bench-press', 'dumbbell-bench-press'], { cardio: { exerciseId: 'treadmill', minutes: 20, intensity: '보통' } }), day(4, ['squat', 'leg-press'])];
  const input: PlanInput = {
    baseExerciseId: 'bench-press',
    baseWeight: 60,
    baseReps: 8,
    goal: '근력',
    weeks: 12,
    days: [1, 4],
    equipment: GYM,
    startDate: '2026-11-02',
    templateId: 'custom',
    custom,
  };
  const { plan, days } = generatePlan(input, BASE_EXERCISES);

  it('계획에 직접 만든 구성을 저장한다', () => {
    expect(plan.templateId).toBe('custom');
    expect(plan.custom).toEqual(custom);
  });
  it('요일마다 고른 종목과 유산소를 그대로 쓴다', () => {
    expect(days).toHaveLength(24);
    expect(days.slice(0, 2).map((d) => [d.weekday, d.routineName])).toEqual([[1, '가슴·유산소'], [4, '하체']]);
    expect(days[0].items.map((i) => [i.exerciseId, i.sets])).toEqual([['bench-press', 4], ['dumbbell-bench-press', 3]]);
    expect(days[0].cardio).toEqual([{ exerciseId: 'treadmill', minutes: 20, intensity: '보통' }]);
    expect(days[1].cardio).toBeUndefined();
  });
  it('기준 운동 무게는 시안과 같은 진행을 따른다', () => {
    expect(days[0].items[0]).toMatchObject({ sets: 4, reps: 8, weight: 55 });
  });
  it('주 5회면 1~2주차 무게를 90%로 시작한다', () => {
    const five = [day(1, ['bench-press']), day(2, ['barbell-row']), day(3, ['squat']), day(4, ['overhead-press']), day(5, ['barbell-curl'])];
    const { days: d5 } = generatePlan({ ...input, days: [1, 2, 3, 4, 5], custom: five }, BASE_EXERCISES);
    const { days: d1 } = generatePlan({ ...input, days: [1], custom: [day(1, ['bench-press'])] }, BASE_EXERCISES);
    const bench = (list: typeof d5, week: number) => list.find((d) => d.week === week && d.weekday === 1)!.items[0];
    // 1주차 77 x 0.9 x 0.70 = 48.5 -> 47.5
    expect(bench(d5, 1)).toMatchObject({ sets: 3, weight: 47.5 });
    expect(bench(d5, 3).weight).toBe(bench(d1, 3).weight);
  });
});

describe('체중 감량 시안의 유산소', () => {
  const input: PlanInput = { baseExerciseId: 'bench-press', baseWeight: 60, baseReps: 8, goal: '체중 감량', weeks: 12, days: [1, 3, 5], equipment: GYM, startDate: '2026-11-02', templateId: 'fat-loss-circuit' };
  it('매번 끝에 20분 유산소, 머신이 있으면 트레드밀', () => {
    const { days } = generatePlan(input, BASE_EXERCISES);
    for (const d of days) expect(d.cardio).toEqual([{ exerciseId: 'treadmill', minutes: 20, intensity: '보통' }]);
  });
  it('머신이 없으면 걷기', () => {
    const { days } = generatePlan({ ...input, equipment: ['덤벨', '맨몸'] }, BASE_EXERCISES);
    expect(days[0].cardio?.[0].exerciseId).toBe('walking');
  });
  it('다른 시안에는 유산소가 없다', () => {
    const { days } = generatePlan({ ...input, goal: '근력', templateId: 'basic-3' }, BASE_EXERCISES);
    expect(days.every((d) => !d.cardio)).toBe(true);
  });
});
