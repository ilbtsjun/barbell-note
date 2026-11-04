import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { useActivePlan, useExerciseMap, useSessions } from '../db/hooks';
import { deleteSession, updateSessionMemo } from '../db/recordRepo';
import type { Exercise, Session } from '../db/types';
import { addDays, fromISODate, mondayOf, monthCells, planDayDate, toISODate, weekNumber, weekdayLabel } from '../lib/dates';
import { daysTrained, personalRecords, sessionSets, sessionVolume, setsSummary, topSet } from '../lib/stats';
import { isHold } from '../lib/templates';
import styles from './Log.module.css';

const DOW_MON = [1, 2, 3, 4, 5, 6, 0];
const PAGE = 15;

/** 기록: 이번 주 횟수, 달력, 최근 운동 */
export default function Log() {
  const sessions = useSessions();
  const active = useActivePlan();
  const exMap = useExerciseMap();
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<number | null>(null);
  if (sessions === undefined || active === undefined || !exMap) return null;

  const today = new Date();
  const todayISO = toISODate(today);
  const monday = mondayOf(today);
  const doneThisWeek = daysTrained(sessions, monday, addDays(monday, 6));

  if (!sessions.length) {
    return (
      <>
        <Band>
          <h1>첫 운동을 기다리고 있어요</h1>
          <p>운동을 저장하면 달력에 표시되고, 이번 주에 몇 번 했는지 알려 드립니다.</p>
        </Band>
        <EmptyState title="운동한 날이 여기에 쌓입니다" action={<Link to="/" className="btn line">오늘 운동 보기</Link>} />
      </>
    );
  }

  // 계획한 날: 날짜 → 루틴 이름
  const planned = new Map<string, string>();
  let plannedThisWeek = 0;
  if (active) {
    const nowWeek = weekNumber(active.plan.startDate, today);
    for (const d of active.days) {
      planned.set(planDayDate(active.plan.startDate, d.week, d.weekday), d.routineName);
      if (d.week === nowWeek) plannedThisWeek++;
    }
  }
  const doneDates = new Map<string, Session>();
  for (const s of [...sessions].reverse()) if (!doneDates.has(s.date)) doneDates.set(s.date, s);

  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = base.getFullYear();
  const m = base.getMonth();
  const monthFrom = toISODate(new Date(y, m, 1));
  const monthTo = toISODate(new Date(y, m + 1, 0));
  const monthCount = daysTrained(sessions, monthFrom, monthTo);
  const prs = personalRecords(sessions);
  const open = sessions.find((s) => s.id === openId);

  const headline = active && plannedThisWeek ? `이번 주 ${plannedThisWeek}번 중 ${doneThisWeek}번` : `이번 주 ${doneThisWeek}번 운동했어요`;
  const todayPlanned = planned.has(todayISO) && !doneDates.has(todayISO);

  return (
    <>
      <Band>
        <h1>{headline}</h1>
        <p>
          {todayPlanned ? `오늘 하면 ${doneThisWeek + 1}번째예요. ` : ''}
          {offset === 0 ? '이번 달' : `${m + 1}월`}에는 {monthCount}번 운동했습니다.
        </p>
      </Band>

      <section className="sec">
        <div className={styles.monthHead}>
          <button type="button" className="btn sm line" onClick={() => setOffset(offset - 1)} aria-label="이전 달">
            이전
          </button>
          <h2 className="sec-title">
            {y}년 {m + 1}월
          </h2>
          <button type="button" className="btn sm line" onClick={() => setOffset(offset + 1)} aria-label="다음 달">
            다음
          </button>
        </div>
        <div className={styles.cal}>
          {DOW_MON.map((d) => (
            <span key={d} className={styles.dow}>
              {weekdayLabel(d)}
            </span>
          ))}
          {monthCells(y, m).map((iso, i) => {
            if (!iso) return <span key={`b${i}`} />;
            const done = doneDates.get(iso);
            const plan = iso >= todayISO ? planned.get(iso) : undefined;
            const n = fromISODate(iso).getDate();
            const props = { 'data-done': !!done || undefined, 'data-today': iso === todayISO || undefined, 'data-planned': (!!plan && !done) || undefined };
            return done ? (
              <button type="button" key={iso} className={styles.d} {...props} onClick={() => setOpenId(done.id ?? null)} aria-label={`${m + 1}월 ${n}일 ${done.routineName} 기록 보기`}>
                {n}
              </button>
            ) : (
              <span key={iso} className={styles.d} {...props} title={plan}>
                {n}
              </span>
            );
          })}
        </div>
        <div className={styles.legend}>
          <span>
            <i className={styles.lgDone} />
            운동한 날
          </span>
          <span>
            <i className={styles.lgToday} />
            오늘
          </span>
          <span>
            <i className={styles.lgPlan} />
            운동할 날
          </span>
        </div>
      </section>

      <section className="sec" style={{ gap: 0 }}>
        <h2 className="sec-title" style={{ marginBottom: 10 }}>
          최근 운동
        </h2>
        {sessions.slice(0, shown).map((s) => {
          const d = fromISODate(s.date);
          const top = topSet(s);
          const pr = s.id !== undefined ? prs.get(s.id) : undefined;
          return (
            <button type="button" key={s.id} className={styles.session} onClick={() => setOpenId(s.id ?? null)}>
              <span className={styles.date}>
                <span className="num">{d.getDate()}</span>
                <small>
                  {d.getMonth() + 1}월 {weekdayLabel(d.getDay())}
                </small>
              </span>
              <span style={{ minWidth: 0 }}>
                <b className={styles.t}>{s.routineName}</b>
                <span className="sub">
                  {s.exercises
                    .slice(0, 3)
                    .map((e) => exMap.get(e.exerciseId)?.name ?? e.exerciseId)
                    .join(', ')}
                  {s.exercises.length > 3 ? ` 외 ${s.exercises.length - 3}개` : ''}
                </span>
                <span className="sub">
                  <b className={`num ${styles.n}`}>{s.minutes}</b>분 · <b className={`num ${styles.n}`}>{sessionSets(s)}</b>세트
                  {top ? (
                    <>
                      {' '}
                      · 최고 <b className={`num ${styles.n}`}>{top.weight}</b>kg
                    </>
                  ) : null}
                </span>
              </span>
              {pr ? <span className={styles.badge}>{exMap.get(pr)?.name ?? ''} 최고 기록</span> : <span />}
            </button>
          );
        })}
        {sessions.length > shown && (
          <button type="button" className="btn line" style={{ marginTop: 12 }} onClick={() => setShown(shown + PAGE)}>
            더 보기 ({sessions.length - shown}개 남음)
          </button>
        )}
      </section>

      {open && <SessionSheet key={open.id} session={open} exMap={exMap} onClose={() => setOpenId(null)} />}
    </>
  );
}

function SessionSheet({ session, exMap, onClose }: { session: Session; exMap: Map<string, Exercise>; onClose: () => void }) {
  const toast = useToast();
  const [memo, setMemo] = useState(session.memo ?? '');
  const [confirm, setConfirm] = useState(false);
  const d = fromISODate(session.date);
  const changed = memo.trim() !== (session.memo ?? '');

  async function saveMemo() {
    try {
      await updateSessionMemo(session.id!, memo);
      toast('메모를 저장했습니다');
    } catch (err) {
      console.error(err);
      toast('메모를 저장하지 못했습니다');
    }
  }

  async function remove() {
    if (!confirm) return setConfirm(true);
    try {
      await deleteSession(session.id!);
      onClose();
      toast('운동 기록을 지웠습니다');
    } catch (err) {
      console.error(err);
      toast('기록을 지우지 못했습니다');
    }
  }

  return (
    <Sheet label={`${session.routineName} 기록`} onClose={onClose}>
      <div>
        <h2 className={styles.sheetTitle}>{session.routineName}</h2>
        <span className="sub">
          {d.getMonth() + 1}월 {d.getDate()}일 {weekdayLabel(d.getDay())}요일 · {session.minutes}분 · 총 {sessionVolume(session).toLocaleString()}kg
        </span>
      </div>
      <div>
        {session.exercises.map((e) => (
          <div key={e.exerciseId} className={styles.exRow}>
            <b>{exMap.get(e.exerciseId)?.name ?? e.exerciseId}</b>
            <span className="sub">{setsSummary(e.sets, isHold(e.exerciseId) ? '초' : '회')}</span>
          </div>
        ))}
      </div>
      <label htmlFor="session-memo" className={styles.lbl}>
        메모
      </label>
      <textarea id="session-memo" className={styles.memo} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="컨디션, 자세에서 느낀 점" />
      {changed && (
        <button type="button" className="btn" onClick={saveMemo}>
          메모 저장
        </button>
      )}
      <button type="button" className={`btn line ${styles.danger}`} data-confirm={confirm || undefined} onClick={remove}>
        {confirm ? '한 번 더 누르면 지웁니다' : '이 기록 지우기'}
      </button>
    </Sheet>
  );
}
