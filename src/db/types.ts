// 앱 데이터 타입. 무게는 모두 kg, 날짜는 'YYYY-MM-DD' 문자열.

export type BodyPart = '가슴' | '등' | '하체' | '어깨' | '팔' | '코어' | '유산소';
/** 유산소 강도 */
export type Intensity = '가볍게' | '보통' | '힘들게';
export type Equipment = '바벨' | '덤벨' | '머신' | '케이블' | '맨몸';
export type Goal = '근력' | '근비대' | '체중 감량';
/** 0=일요일 ... 6=토요일 (Date.getDay()와 같음) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Profile {
  id: 'me';
  bodyWeight: number;
  goal: Goal;
  days: Weekday[];
  equipment: Equipment[];
  /** 봉 무게와 가진 원판 (원판 계산용) */
  barWeight: number;
  plates: number[];
}

export interface Exercise {
  id: string;
  name: string;
  part: BodyPart;
  equipment: Equipment;
  /** 원판 그림을 보여줄지 */
  barbell: boolean;
  steps: string[];
  /** 사용자가 직접 추가한 운동 */
  custom?: boolean;
}

export interface Plan {
  id?: number;
  baseExerciseId: string;
  baseWeight: number;
  baseReps: number;
  start1RM: number;
  target1RM: number;
  weeks: number;
  startDate: string;
  active: boolean;
  /** 고른 계획 시안 id (src/lib/templates.ts). 직접 만든 계획은 'custom' */
  templateId?: string;
  /** 직접 만든 계획의 요일별 구성 (다시 고칠 때 채워 넣는다) */
  custom?: CustomDay[];
  /** 사용자가 붙인 이름 (없으면 시안 이름) */
  name?: string;
  /** 만들 때 고른 목표, 요일, 기구 (다시 고치거나 이 계획으로 바꿀 때 쓴다) */
  goal?: Goal;
  days?: Weekday[];
  equipment?: Equipment[];
}

/** 계획에 넣은 유산소 */
export interface PlannedCardio {
  exerciseId: string;
  minutes: number;
  intensity: Intensity;
}

/** 직접 만드는 계획의 하루 */
export interface CustomDay {
  weekday: Weekday;
  /** 근력 부위 (유산소는 cardio로 따로) */
  parts: BodyPart[];
  exercises: string[];
  cardio?: PlannedCardio;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  restSec: number;
}

export interface PlanDay {
  id?: number;
  planId: number;
  week: number;
  weekday: Weekday;
  routineName: string;
  items: PlannedExercise[];
  cardio?: PlannedCardio[];
}

export interface SetRecord {
  weight: number;
  reps: number;
  done: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  restSec: number;
  sets: SetRecord[];
}

/** 한 유산소 기록 */
export interface CardioEntry {
  exerciseId: string;
  minutes: number;
  distanceKm?: number;
  intensity: Intensity;
}

export interface Session {
  id?: number;
  date: string;
  routineName: string;
  minutes: number;
  exercises: SessionExercise[];
  cardio?: CardioEntry[];
  memo?: string;
  /** 계획에 따라 한 운동이면 그 계획과 주차 */
  planId?: number;
  week?: number;
}

/** 쉬는 시간 타이머. 끝나는 시각을 저장해서 새로고침하거나 화면을 꺼도 이어진다. */
export interface RestTimer {
  endsAt: number;
  total: number;
  label: string;
}

/** 진행 중인 운동 (하나만 저장). 운동을 끝내면 Session으로 옮기고 지운다. */
export interface Workout {
  id: 'current';
  /** 'YYYY-MM-DD' 운동을 시작한 날 */
  date: string;
  routineName: string;
  /** 첫 세트를 체크한 시각 (ms) */
  startedAt: number;
  exercises: SessionExercise[];
  /** 유산소 (계획에 있던 것과 직접 추가한 것) */
  cardio?: (CardioEntry & { done: boolean })[];
  /** 유산소 시간 재기: 몇 번째 유산소를 언제부터 쟀는지 */
  cardioClock?: { index: number; startedAt: number };
  planId?: number;
  week?: number;
  rest?: RestTimer;
}

export interface BodyWeight {
  date: string;
  weight: number;
}
