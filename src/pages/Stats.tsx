import { useState, type FormEvent } from 'react';
import { Band } from '../components/Band';
import { LineChart } from '../components/LineChart';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { useActivePlan, useBodyWeights, useExerciseMap, useProfile, useSessions } from '../db/hooks';
import { saveBodyWeight } from '../db/recordRepo';
import type { Exercise, Session } from '../db/types';
import { cardioTotals, WEEKLY_CARDIO_GOAL } from '../lib/cardio';
import { addDays, fromISODate, mondayOf, toISODate, weekNumber } from '../lib/dates';
import { weeklyLoads } from '../lib/planGenerator';
import { hoursLabel, liftHistory, liftSummaries, weightChange, type LiftSummary } from '../lib/stats';
import styles from './Stats.module.css';

const fmt = (v: number) => String(Math.round(v * 10) / 10);
const md = (iso: string) => {
  const d = fromISODate(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};
const daysBetween = (a: string, b: string) => Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86400000);

/** 통계: 몸무게, 목표 진행, 운동별 1RM */
export default function Stats() {
  const sessions = useSessions();
  const weights = useBodyWeights();
  const active = useActivePlan();
  const exMap = useExerciseMap();
  const profile = useProfile();
  const toast = useToast();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [openLift, setOpenLift] = useState<string | null>(null);
  if (sessions === undefined || weights === undefined || active === undefined || !exMap) return null;

  const todayISO = toISODate(new Date());
  const change = weightChange(weights);
  const recent = weights.filter((w) => w.date >= addDays(todayISO, -90));
  const lifts = liftSummaries(sessions);
  const totalMin = sessions.reduce((a, s) => a + s.minutes, 0);
  const firstDate = sessions.length ? sessions[sessions.length - 1].date : null;
  const name = (id: string) => exMap.get(id)?.name ?? id;

  let headline = '기록이 쌓이면 보여 드릴게요';
  if (change && change.first.date !== change.last.date) {
    const days = daysBetween(change.first.date, change.last.date);
    const span = days >= 7 ? `${Math.round(days / 7)}주 동안` : `${days}일 동안`;
    headline = change.diff === 0 ? `${span} 몸무게 그대로예요` : `${span} ${fmt(Math.abs(change.diff))}kg ${change.diff < 0 ? '빠졌어요' : '늘었어요'}`;
  } else if (sessions.length) {
    headline = `지금까지 ${sessions.length}번 운동했어요`;
  }
  const gained = lifts.filter((l) => l.gain > 0).length;

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const v = parseFloat(input);
    if (!(v >= 30 && v <= 250)) return setError('몸무게는 30~250kg 사이로 입력하세요.');
    try {
      await saveBodyWeight(todayISO, v);
      setInput('');
      toast(`오늘 몸무게 ${fmt(v)}kg을 기록했습니다`);
    } catch (err) {
      console.error(err);
      setError('저장하지 못했습니다. 다시 눌러 주세요.');
    }
  }

  return (
    <>
      <Band>
        <h1>{headline}</h1>
        <p>
          {firstDate
            ? `${md(firstDate)}부터 ${sessions.length}번, 모두 ${hoursLabel(totalMin)} 운동했습니다.${gained ? ` ${gained}개 운동의 1RM이 올랐습니다.` : ''}`
            : '몸무게 변화와 운동별 1RM이 얼마나 올랐는지 한눈에 볼 수 있습니다.'}
        </p>
      </Band>

      <section className="sec">
        <div className={styles.head}>
          <h2 className="sec-title">몸무게</h2>
          {change && (
            <span className="sub">
              <span className={`num ${styles.n}`}>{fmt(change.first.weight)}</span> → <b className={`num ${styles.n}`}>{fmt(change.last.weight)}</b> kg
            </span>
          )}
        </div>
        {recent.length > 1 ? (
          <LineChart label="최근 90일 몸무게" points={recent.map((w) => ({ date: w.date, value: w.weight }))} />
        ) : (
          <p className="sub">이틀 이상 기록하면 그래프가 나타납니다. 아침에 같은 시간에 재면 변화가 잘 보입니다.</p>
        )}
        <form className={styles.wtForm} onSubmit={submit} noValidate>
          <input
            className={`num ${styles.input}`}
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="오늘 몸무게 (kg)"
            aria-label="오늘 몸무게 (kg)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
          />
          <button className="btn" type="submit">
            기록하기
          </button>
        </form>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      <CardioSection sessions={sessions} bodyWeight={weights[weights.length - 1]?.weight ?? profile?.bodyWeight ?? 70} />

      {active && <GoalSection plan={active.plan} sessions={sessions} liftName={name(active.plan.baseExerciseId)} />}

      <section className="sec" style={{ gap: 0 }}>
        <div className={styles.head} style={{ marginBottom: 10 }}>
          <h2 className="sec-title">운동별 1RM</h2>
          {lifts.length > 0 && <span className="sub">처음 기록과 비교</span>}
        </div>
        {lifts.length === 0 && <p className="sub">무게를 든 운동을 저장하면 종목마다 추정 1RM이 쌓입니다.</p>}
        {lifts.map((l) => (
          <button type="button" key={l.exerciseId} className={styles.lift} onClick={() => setOpenLift(l.exerciseId)}>
            <span>
              <b>{name(l.exerciseId)}</b>
              <br />
              <span className={l.gain > 0 ? styles.gain : styles.flat}>{l.points.length < 2 ? '첫 기록' : l.gain > 0 ? `+${fmt(l.gain)}kg` : '그대로'}</span>
            </span>
            <span className={styles.v}>
              <span className="num">{fmt(l.best)}</span>
              <small> kg</small>
            </span>
            <span className={styles.track}>
              <span className={styles.fill} style={{ width: `${(l.best / lifts[0].best) * 100}%` }} />
            </span>
          </button>
        ))}
      </section>

      {openLift && <LiftSheet lift={lifts.find((l) => l.exerciseId === openLift)!} exercise={exMap.get(openLift)} onClose={() => setOpenLift(null)} />}
    </>
  );
}

/** 유산소: 이번 주 권장 150분 대비, 최근 4주 */
function CardioSection({ sessions, bodyWeight }: { sessions: Session[]; bodyWeight: number }) {
  const monday = mondayOf(new Date());
  const weeks = [0, 1, 2, 3].map((i) => {
    const from = addDays(monday, -7 * i);
    return { from, ...cardioTotals(sessions, from, addDays(from, 6), bodyWeight) };
  });
  const now = weeks[0];
  const left = Math.max(0, WEEKLY_CARDIO_GOAL - now.credit);
  const pct = (v: number) => `${Math.min(100, (v / WEEKLY_CARDIO_GOAL) * 100)}%`;
  const hasAny = weeks.some((w) => w.count > 0);

  return (
    <section className="sec">
      <div className={styles.head}>
        <h2 className="sec-title">유산소</h2>
        <span className="sub">이번 주 권장 {WEEKLY_CARDIO_GOAL}분</span>
      </div>
      <div className={styles.goal}>
        <div className={styles.goalNums}>
          <span>
            <small>이번 주 (분)</small>
            <b className="num">{now.credit}</b>
          </span>
          <span>
            <small>거리 (km)</small>
            <b className="num">{now.distanceKm ? fmt(now.distanceKm) : '-'}</b>
          </span>
          <span>
            <small>소모 (약 kcal)</small>
            <b className="num">{now.kcal.toLocaleString()}</b>
          </span>
        </div>
        <div className={styles.goalBar} role="img" aria-label={`이번 주 유산소 ${now.credit}분, 권장 ${WEEKLY_CARDIO_GOAL}분`}>
          <span className={styles.goalFill} style={{ width: pct(now.credit) }} />
        </div>
        <p className="sub">
          {left ? `${left}분 더 하면 이번 주 권장량을 채웁니다.` : '이번 주 권장량을 채웠습니다.'} 힘들게 한 시간은 2배로 칩니다.
        </p>
      </div>
      {hasAny && (
        <div>
          {weeks.map((w, i) => (
            <div key={w.from} className={styles.pt}>
              <span>{i === 0 ? '이번 주' : i === 1 ? '지난주' : `${md(w.from)} 주`}</span>
              <span>
                <b className="num">{w.minutes}분</b>
                {w.count ? ` · ${w.count}번` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** 기준 운동의 실제 1RM이 계획 대비 어디쯤인지 */
function GoalSection({ plan, sessions, liftName }: { plan: NonNullable<ReturnType<typeof useActivePlan>>['plan']; sessions: Parameters<typeof liftHistory>[0]; liftName: string }) {
  const history = (liftHistory(sessions).get(plan.baseExerciseId) ?? []).filter((p) => p.date >= plan.startDate);
  const now = Math.min(weekNumber(plan.startDate), plan.weeks);
  const expected = weeklyLoads(plan.start1RM, plan.target1RM, plan.weeks)[now - 1].est1RM;
  const actual = history.length ? Math.max(...history.map((p) => p.oneRm)) : plan.start1RM;
  const span = plan.target1RM - plan.start1RM || 1;
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - plan.start1RM) / span) * 100))}%`;
  const diff = Math.round((actual - expected) * 10) / 10;

  return (
    <section className="sec">
      <div className={styles.head}>
        <h2 className="sec-title">목표 진행</h2>
        <span className="sub">
          {liftName} · {now}주차
        </span>
      </div>
      <div className={styles.goal}>
        <div className={styles.goalNums}>
          <span>
            <small>지금</small>
            <b className="num">{fmt(actual)}</b>
          </span>
          <span>
            <small>이번 주 계획</small>
            <b className="num">{fmt(expected)}</b>
          </span>
          <span>
            <small>목표</small>
            <b className="num">{fmt(plan.target1RM)}</b>
          </span>
        </div>
        <div className={styles.goalBar} role="img" aria-label={`시작 ${plan.start1RM}kg, 지금 ${fmt(actual)}kg, 목표 ${plan.target1RM}kg`}>
          <span className={styles.goalFill} style={{ width: pos(actual) }} />
          <span className={styles.goalMark} style={{ left: pos(expected) }} />
        </div>
        <p className="sub">
          {history.length
            ? diff >= 0
              ? `계획보다 ${fmt(diff)}kg 앞서 있습니다.`
              : `계획보다 ${fmt(-diff)}kg 뒤에 있습니다. 회복 주를 잘 지키면 따라잡을 수 있습니다.`
            : `계획을 시작한 뒤 ${liftName} 기록이 생기면 계획과 비교해 드립니다.`}
        </p>
      </div>
      {history.length > 0 && (
        <LineChart label={`${liftName} 추정 1RM`} target={plan.target1RM} points={[...(history[0].date > plan.startDate ? [{ date: plan.startDate, value: plan.start1RM }] : []), ...history.map((p) => ({ date: p.date, value: p.oneRm }))]} />
      )}
    </section>
  );
}

function LiftSheet({ lift, exercise, onClose }: { lift: LiftSummary; exercise?: Exercise; onClose: () => void }) {
  const name = exercise?.name ?? lift.exerciseId;
  return (
    <Sheet label={`${name} 1RM 기록`} onClose={onClose}>
      <div className={styles.head} style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className={styles.sheetTitle}>{name}</h2>
          <span className="sub">
            {exercise ? `${exercise.part} · ${exercise.equipment} · ` : ''}
            {lift.points.length}번 기록
          </span>
        </div>
        <div className={styles.v}>
          <span className="num">{fmt(lift.best)}</span>
          <small> kg</small>
          <div className="sub">최고 1RM</div>
        </div>
      </div>
      {lift.points.length > 1 ? (
        <LineChart label={`${name} 추정 1RM`} points={lift.points.map((p) => ({ date: p.date, value: p.oneRm }))} />
      ) : (
        <p className="sub">한 번 더 하면 변화 그래프가 나타납니다.</p>
      )}
      <div>
        {[...lift.points]
          .reverse()
          .slice(0, 6)
          .map((p) => (
            <div key={p.date} className={styles.pt}>
              <span>{md(p.date)}</span>
              <b className="num">{fmt(p.oneRm)}kg</b>
            </div>
          ))}
      </div>
      <p className="sub">추정 1RM은 그날 가장 좋은 세트의 무게와 횟수로 계산합니다(12회 이하 세트만).</p>
    </Sheet>
  );
}
