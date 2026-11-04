import { Link } from 'react-router-dom';
import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';
import { useActivePlan, useExerciseMap } from '../db/hooks';
import type { Weekday } from '../db/types';
import { weekNumber, weekdayLabel } from '../lib/dates';
import { progressSeries, weeklyLoads } from '../lib/planGenerator';
import { getTemplate, isHold } from '../lib/templates';
import styles from './Plan.module.css';

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default function Plan() {
  const data = useActivePlan();
  const exMap = useExerciseMap();
  if (data === undefined) return null;
  if (data === null) {
    return (
      <>
        <Band>
          <h1>아직 계획이 없어요</h1>
          <p>지금 드는 무게로 1RM을 계산하고, 목표까지 주차별 무게를 정해 드립니다.</p>
        </Band>
        <EmptyState title="주차별 계획이 여기에 나타납니다" action={<Link to="/setup" className="btn">계획 만들기</Link>}>
          4주마다 가볍게 회복하는 주가 들어가고, 무게는 2.5kg 단위로 맞춥니다.
        </EmptyState>
      </>
    );
  }

  const { plan, days } = data;
  const liftName = exMap?.get(plan.baseExerciseId)?.name ?? '';
  const now = Math.min(weekNumber(plan.startDate), plan.weeks);
  const template = getTemplate(plan.templateId);
  const loads = weeklyLoads(plan.start1RM, plan.target1RM, plan.weeks);
  // 표와 그래프는 실제로 하는 대표 운동 기준 (기준 운동이 없으면 첫 주 운동)
  const series = progressSeries(days, plan.baseExerciseId);
  const seriesName = exMap?.get(series.exerciseId)?.name ?? '';
  const bars = loads.map((l) => series.rows.get(l.week)?.weight || l.est1RM * l.pct);
  const lo = Math.min(...bars) * 0.85;
  const hi = Math.max(...bars);
  const near = loads.slice(Math.max(0, now - 2), now + 3);
  const thisWeek = new Map(days.filter((d) => d.week === now).map((d) => [d.weekday, d.routineName]));
  const todayDow = new Date().getDay();
  const goalLabel = plan.target1RM - plan.start1RM;

  return (
    <>
      <Band>
        <p>
          {template.name} · {plan.weeks}주 계획 · {now}주차
        </p>
        <div className={styles.goal}>
          <span className={`num ${styles.big}`}>{plan.start1RM}</span>
          <span className={`num ${styles.arrow}`} aria-label="에서">→</span>
          <span className={`num ${styles.big}`}>
            {plan.target1RM}
            <small>kg</small>
          </span>
        </div>
        <p>
          {liftName} {plan.baseWeight}kg × {plan.baseReps}회로 계산한 1RM은 약 {plan.start1RM}kg입니다. {plan.weeks}주 뒤 {goalLabel > 0 ? `${goalLabel.toFixed(1).replace('.0', '')}kg 올린 ` : ''}
          {plan.target1RM}kg이 목표입니다.
        </p>
      </Band>

      <section className="sec">
        <div className={styles.head}>
          <h2 className="sec-title">주차별 작업 무게</h2>
          <Link to="/setup" className="btn sm line">기록 다시 입력</Link>
        </div>
        <div className={styles.weeks} style={{ gridTemplateColumns: `repeat(${plan.weeks}, 1fr)` }} role="img" aria-label={`${seriesName} 주차별 작업 무게 그래프`}>
          {loads.map((l, i) => (
            <div
              key={l.week}
              className={styles.wk}
              data-state={l.week < now ? 'done' : l.week === now ? 'now' : l.deload ? 'deload' : undefined}
              style={{ height: `${((bars[i] - lo) / (hi - lo || 1)) * 80 + 20}%` }}
              title={`${l.week}주차 ${series.rows.get(l.week)?.weight ?? l.weight}kg`}
            />
          ))}
        </div>
        <div className={styles.wkLabels} style={{ gridTemplateColumns: `repeat(${plan.weeks}, 1fr)` }} aria-hidden="true">
          {loads.map((l) => (
            <span key={l.week}>{l.week}</span>
          ))}
        </div>
        <div className={styles.legend}>
          <span><i className={styles.lgDone} />지난 주</span>
          <span><i className={styles.lgNow} />이번 주</span>
          <span><i className={styles.lgDeload} />가볍게 회복하는 주</span>
        </div>
        <table className={styles.prog}>
          <thead>
            <tr><th>주차</th><th>세트 × 횟수</th><th className={styles.r}>{seriesName}</th></tr>
          </thead>
          <tbody>
            {near.map((l) => {
              const row = series.rows.get(l.week);
              return (
                <tr key={l.week} data-now={l.week === now || undefined}>
                  <td>{l.week}주차{l.deload ? ' (회복)' : ''}{l.week === now ? ' · 이번 주' : ''}</td>
                  <td>{row ? `${row.sets} × ${row.reps}${isHold(series.exerciseId) ? '초' : ''}` : '-'}</td>
                  <td className={`num ${styles.r}`}>{row?.weight ? `${row.weight}kg` : '맨몸'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="sec">
        <h2 className="sec-title">이번 주 일정</h2>
        <div className={styles.week7}>
          {WEEK.map((d) => {
            const name = thisWeek.get(d);
            return (
              <div key={d} className={styles.day} data-on={!!name || undefined} data-today={d === todayDow || undefined}>
                <b>{weekdayLabel(d)}</b>
                {name ?? '쉼'}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
