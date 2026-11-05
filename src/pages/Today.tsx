import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useActivePlan, useExerciseMap, useProfile, useSessionsOn, useWorkout } from '../db/hooks';
import { saveWorkout } from '../db/workoutRepo';
import type { Exercise, PlanDay, Session } from '../db/types';
import { fromISODate, koreanDate, toISODate, weekNumber, weekdayLabel } from '../lib/dates';
import { setsSummary } from '../lib/stats';
import { isHold } from '../lib/templates';
import { cardioKcal, distanceLabel } from '../lib/cardio';
import { cardioOnlyWorkout, workoutFromDay } from '../lib/workout';
import styles from './Today.module.css';
import { WorkoutView } from './WorkoutView';

const FIRST_VISIT_KEY = 'barbell-note:setup-shown';
const weekOrder = (d: number) => (d === 0 ? 7 : d);

/** 오늘의 운동: 진행 중인 운동 > 오늘 완료 요약 > 오늘 계획 > 쉬는 날 순서로 보여준다. */
export default function Today() {
  const profile = useProfile();
  const data = useActivePlan();
  const exMap = useExerciseMap();
  const workout = useWorkout();
  const today = new Date();
  const todayISO = toISODate(today);
  const sessions = useSessionsOn(todayISO);
  const navigate = useNavigate();
  const toast = useToast();

  /** 근력 운동 없이 유산소만 기록하기 */
  async function startCardio() {
    const machine = profile?.equipment.includes('머신');
    try {
      await saveWorkout(cardioOnlyWorkout({ exerciseId: machine ? 'treadmill' : 'walking', minutes: 20, intensity: '보통' }, toISODate(new Date()), Date.now()));
    } catch (err) {
      console.error(err);
      toast('유산소를 시작하지 못했습니다. 다시 눌러 주세요');
    }
  }
  const cardioButton = (
    <button type="button" className="btn line" onClick={startCardio}>
      유산소만 기록하기
    </button>
  );

  // 처음 설치하고 열면 능력 입력 화면부터 보여준다 (한 번만).
  useEffect(() => {
    if (profile !== null) return;
    try {
      if (sessionStorage.getItem(FIRST_VISIT_KEY)) return;
      sessionStorage.setItem(FIRST_VISIT_KEY, '1');
    } catch {
      /* 저장소를 못 쓰는 환경이면 그냥 이동 */
    }
    navigate('/setup', { replace: true });
  }, [profile, navigate]);

  if (data === undefined || workout === undefined || sessions === undefined || !exMap) return null;

  // 하던 운동이 있으면 그대로 이어서
  if (workout) {
    const started = workout.date === todayISO ? koreanDate(today) : `${koreanDate(fromISODate(workout.date))}에 시작`;
    return (
      <WorkoutView
        key={`${workout.date}-${workout.routineName}`}
        initial={workout}
        saved
        exMap={exMap}
        profile={profile ?? null}
        heading={`${started}${workout.week ? ` · ${workout.week}주차` : ''}`}
      />
    );
  }

  if (sessions.length) return <DoneToday sessions={sessions} exMap={exMap} today={today} bodyWeight={profile?.bodyWeight ?? 70} cardioButton={cardioButton} />;

  if (data === null) {
    return (
      <>
        <Band>
          <p>{koreanDate(today)}</p>
          <h1>오늘 할 운동이 아직 없어요</h1>
          <p>최근에 든 무게를 알려주시면 계획을 짜서 여기에 매일 할 운동을 띄워 드립니다.</p>
        </Band>
        <EmptyState
          title="계획부터 만들어요"
          action={
            <>
              <Link to="/setup" className="btn">
                내 운동능력 입력하기
              </Link>
              {cardioButton}
            </>
          }
        >
          기준 운동 하나의 무게와 횟수, 운동하는 요일만 있으면 됩니다. 계획 없이 유산소만 기록할 수도 있습니다.
        </EmptyState>
      </>
    );
  }

  const week = Math.min(weekNumber(data.plan.startDate, today), data.plan.weeks);
  const day = data.days.find((d) => d.week === week && d.weekday === today.getDay());

  if (day) {
    return (
      <WorkoutView
        key={`${todayISO}-${day.routineName}`} // 첫 체크로 저장돼도 같은 key라 화면이 다시 그려지지 않는다
        initial={workoutFromDay(day, todayISO, Date.now())}
        saved={false}
        exMap={exMap}
        profile={profile ?? null}
        heading={`${koreanDate(today)} · ${week}주차`}
      />
    );
  }

  // 쉬는 날: 이번 주 루틴 중 하나를 골라 대신 할 수 있다
  const thisWeek = data.days.filter((d) => d.week === week).sort((a, b) => weekOrder(a.weekday) - weekOrder(b.weekday));
  const upcoming = thisWeek.find((d) => weekOrder(d.weekday) > weekOrder(today.getDay()));
  const choices = [...new Map(thisWeek.map((d) => [d.routineName, d])).values()];

  async function startInstead(d: PlanDay) {
    try {
      await saveWorkout(workoutFromDay(d, todayISO, Date.now()));
    } catch (err) {
      console.error(err);
      toast('운동을 시작하지 못했습니다. 다시 눌러 주세요');
    }
  }

  return (
    <>
      <Band>
        <p>
          {koreanDate(today)} · {week}주차
        </p>
        <h1>오늘은 쉬는 날</h1>
        <p>{upcoming ? `다음 운동은 ${weekdayLabel(upcoming.weekday)}요일 ${upcoming.routineName}입니다.` : '이번 주 운동은 다 지나갔습니다. 근육은 쉬는 동안 자랍니다.'}</p>
      </Band>
      <section className="sec">
        <h2 className="sec-title">대신 운동하기</h2>
        <p className="sub">오늘 운동하고 싶으면 이번 주 루틴 중 하나를 고르세요. 계획 무게 그대로 시작합니다.</p>
        {choices.map((d) => (
          <button type="button" key={d.routineName} className={styles.pick} onClick={() => startInstead(d)}>
            <span>
              <b>{d.routineName}</b>
              <br />
              <span className={styles.pickMeta}>
                {d.items.length}종목 · {d.items.reduce((a, i) => a + i.sets, 0)}세트 · {d.items.map((i) => exMap.get(i.exerciseId)?.name).slice(0, 2).join(', ')} 외
              </span>
            </span>
            <span className={styles.pickGo}>시작</span>
          </button>
        ))}
        {cardioButton}
      </section>
    </>
  );
}

/** 오늘 저장한 운동 요약 */
function DoneToday({ sessions, exMap, today, bodyWeight, cardioButton }: { sessions: Session[]; exMap: Map<string, Exercise>; today: Date; bodyWeight: number; cardioButton: ReactNode }) {
  const last = sessions[sessions.length - 1];
  const sets = sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const cardio = sessions.flatMap((s) => (s.cardio ?? []).map((c, i) => ({ ...c, key: `${s.id}-c${i}` })));
  return (
    <>
      <Band>
        <p>{koreanDate(today)}</p>
        <h1>오늘 운동 완료</h1>
        <p>
          {sessions.map((s) => s.routineName).join(', ')} · {minutes}분{sets ? ` · ${sets}세트` : ''}
          {cardio.length ? ` · 유산소 ${cardio.reduce((a, c) => a + c.minutes, 0)}분` : ''}
        </p>
      </Band>
      <section className="sec">
        <h2 className="sec-title">오늘 한 운동</h2>
        <div>
          {sessions.flatMap((s) =>
            s.exercises.map((e) => {
              const top = Math.max(...e.sets.map((x) => x.weight));
              return (
                <div key={`${s.id}-${e.exerciseId}`} className={styles.row}>
                  <b>{exMap.get(e.exerciseId)?.name ?? e.exerciseId}</b>
                  <span className="num" style={{ fontWeight: 700, fontSize: 18 }}>
                    {top ? `${top}kg` : '맨몸'}
                  </span>
                  <span className={styles.rowSets}>{setsSummary(e.sets, isHold(e.exerciseId) ? '초' : '회')}</span>
                </div>
              );
            }),
          )}
          {cardio.map((c) => (
            <div key={c.key} className={styles.row}>
              <b>{exMap.get(c.exerciseId)?.name ?? c.exerciseId}</b>
              <span className="num" style={{ fontWeight: 700, fontSize: 18 }}>
                {c.minutes}분
              </span>
              <span className={styles.rowSets}>
                {c.intensity}
                {distanceLabel(c.distanceKm)} · 약 {cardioKcal(c, bodyWeight)}kcal
              </span>
            </div>
          ))}
        </div>
        {last.memo && <p className={styles.memoText}>{last.memo}</p>}
        {cardioButton}
        <Link to="/plan" className="btn line">
          다음 운동 보기
        </Link>
      </section>
    </>
  );
}
