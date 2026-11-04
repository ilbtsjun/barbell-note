/**
 * 벤치프레스 1RM을 1로 봤을 때 다른 운동의 대략적인 1RM 비율.
 * 기준 운동 하나만 입력받기 때문에, 나머지 운동의 첫 무게를 어림잡는 데 쓴다.
 * 실제 기록이 쌓이면 그 기록으로 바뀐다. 덤벨은 한 손 무게 기준.
 */
export const RATIO_TO_BENCH: Record<string, number> = {
  'bench-press': 1,
  'incline-bench-press': 0.82,
  'decline-bench-press': 1.02,
  'close-grip-bench-press': 0.88,
  'dumbbell-bench-press': 0.36,
  'incline-dumbbell-press': 0.31,
  'dumbbell-fly': 0.16,
  'chest-press-machine': 0.95,
  'pec-deck': 0.6,
  'cable-crossover': 0.25,
  squat: 1.3,
  'front-squat': 1.05,
  deadlift: 1.55,
  'romanian-deadlift': 1.1,
  'hip-thrust': 1.4,
  'leg-press': 2.4,
  'hack-squat': 1.5,
  'leg-extension': 0.75,
  'leg-curl': 0.6,
  'calf-raise': 1.2,
  lunge: 0.25,
  'bulgarian-split-squat': 0.22,
  'goblet-squat': 0.4,
  'overhead-press': 0.63,
  'dumbbell-shoulder-press': 0.24,
  'shoulder-press-machine': 0.6,
  'lateral-raise': 0.1,
  'front-raise': 0.11,
  'rear-delt-fly': 0.09,
  'cable-lateral-raise': 0.07,
  'upright-row': 0.5,
  'face-pull': 0.3,
  'barbell-row': 0.85,
  'pendlay-row': 0.8,
  't-bar-row': 0.8,
  'lat-pulldown': 0.8,
  'seated-cable-row': 0.8,
  'one-arm-dumbbell-row': 0.33,
  'barbell-curl': 0.42,
  'dumbbell-curl': 0.18,
  'hammer-curl': 0.19,
  'preacher-curl': 0.38,
  'cable-pushdown': 0.38,
  'overhead-triceps-extension': 0.3,
  'skull-crusher': 0.4,
  'russian-twist': 0.12,
  'cable-crunch': 0.6,
};

/** 기준 운동의 1RM으로 다른 운동의 1RM을 어림잡는다. 비율이 없으면(맨몸 등) 0. */
export function estimate1RMFor(exerciseId: string, baseExerciseId: string, base1RM: number): number {
  const target = RATIO_TO_BENCH[exerciseId];
  const base = RATIO_TO_BENCH[baseExerciseId];
  if (!target || !base) return 0;
  return (base1RM / base) * target;
}
