import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';
import { useActivePlan, useExerciseMap, useProfile } from '../db/hooks';
import { koreanDate, weekNumber } from '../lib/dates';
import { isHold } from '../lib/templates';

const FIRST_VISIT_KEY = 'barbell-note:setup-shown';

/** 오늘의 운동. 3단계에서 세트 표, 휴식 타이머, 운동 저장이 들어온다. */
export default function Today() {
  const profile = useProfile();
  const data = useActivePlan();
  const exMap = useExerciseMap();
  const navigate = useNavigate();

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

  if (data === undefined) return null;
  const today = new Date();

  if (data === null) {
    return (
      <>
        <Band>
          <p>{koreanDate(today)}</p>
          <h1>오늘 할 운동이 아직 없어요</h1>
          <p>최근에 든 무게를 알려주시면 계획을 짜서 여기에 매일 할 운동을 띄워 드립니다.</p>
        </Band>
        <EmptyState title="계획부터 만들어요" action={<Link to="/setup" className="btn">내 운동능력 입력하기</Link>}>
          기준 운동 하나의 무게와 횟수, 운동하는 요일만 있으면 됩니다.
        </EmptyState>
      </>
    );
  }

  const week = Math.min(weekNumber(data.plan.startDate, today), data.plan.weeks);
  const day = data.days.find((d) => d.week === week && d.weekday === today.getDay());

  if (!day) {
    return (
      <>
        <Band>
          <p>{koreanDate(today)} · {week}주차</p>
          <h1>오늘은 쉬는 날</h1>
          <p>근육은 쉬는 동안 자랍니다. 다음 운동은 계획 탭에서 확인하세요.</p>
        </Band>
        <EmptyState title="이번 주 일정 보기" action={<Link to="/plan" className="btn line">계획 보기</Link>} />
      </>
    );
  }

  return (
    <>
      <Band>
        <p>{koreanDate(today)} · {week}주차</p>
        <h1>오늘은 {day.routineName}</h1>
        <p>{day.items.length}종목 · {day.items.reduce((a, i) => a + i.sets, 0)}세트</p>
      </Band>
      <section className="sec" style={{ borderBottom: 0, gap: 0 }}>
        {day.items.map((it, i) => (
          <div key={it.exerciseId} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
            <span className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-3)' }}>{i + 1}</span>
            <span>
              <b>{exMap?.get(it.exerciseId)?.name}</b>
              <br />
              <span className="sub">{it.sets}세트 × {it.reps}{isHold(it.exerciseId) ? '초' : '회'} · 쉬는 시간 {it.restSec}초</span>
            </span>
            <span className="num" style={{ fontSize: 24, fontWeight: 700 }}>
              {it.weight ? <>{it.weight}<small style={{ fontSize: 12, color: 'var(--ink-3)' }}>kg</small></> : <small style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--f-body)' }}>맨몸</small>}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
