// 앱 데이터 타입. 무게는 모두 kg, 날짜는 'YYYY-MM-DD' 문자열.

export type BodyPart = '가슴' | '등' | '하체' | '어깨' | '팔' | '코어';
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

export interface Session {
  id?: number;
  date: string;
  routineName: string;
  minutes: number;
  exercises: SessionExercise[];
  memo?: string;
}

export interface BodyWeight {
  date: string;
  weight: number;
}
