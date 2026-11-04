import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Band } from '../components/Band';
import { useToast } from '../components/Toast';
import { useActivePlan, useExerciseMap, useProfile } from '../db/hooks';
import { createPlan, DEFAULT_PROFILE } from '../db/planRepo';
import type { Equipment, Goal, Weekday } from '../db/types';
import { mondayOf, weekdayLabel } from '../lib/dates';
import { epley1RM, isReliableReps } from '../lib/oneRm';
import { BASE_LIFTS } from '../lib/planGenerator';
import { DEFAULT_DAYS, exerciseCountLabel, getTemplate, recommendTemplates, sessionsLabel, TEMPLATES, type PlanTemplate } from '../lib/templates';
import styles from './Setup.module.css';

const GOALS: Goal[] = ['근력', '근비대', '체중 감량'];
const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const EQUIPMENT: Equipment[] = ['바벨', '덤벨', '머신', '케이블'];
const PERIODS = [8, 12, 16];

/** 받침이 있으면 '으로/은', 없거나 ㄹ이면 '로/는' */
function withJosa(word: string, kind: '으로' | '은') {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const final = code >= 0 && code < 11172 ? code % 28 : 0;
  if (kind === '으로') return word + (final && final !== 8 ? '으로' : '로');
  return word + (final ? '은' : '는');
}

/** 능력 입력: 기준 기록으로 1RM을 계산하고 계획을 만든다. */
export default function Setup() {
  const profile = useProfile();
  const active = useActivePlan();
  const exMap = useExerciseMap();
  const navigate = useNavigate();
  const toast = useToast();

  const [lift, setLift] = useState<string>('bench-press');
  const [weight, setWeight] = useState('60');
  const [reps, setReps] = useState('8');
  const [bodyWeight, setBodyWeight] = useState(String(DEFAULT_PROFILE.bodyWeight));
  const [goal, setGoal] = useState<Goal>(DEFAULT_PROFILE.goal);
  const [days, setDays] = useState<Weekday[]>(DEFAULT_PROFILE.days);
  const [equipment, setEquipment] = useState<Equipment[]>(DEFAULT_PROFILE.equipment);
  const [weeks, setWeeks] = useState(12);
  const [templateId, setTemplateId] = useState('basic-3');
  /** 사용자가 직접 고른 시안은 목표나 기구를 바꿔도 그대로 둔다 */
  const [picked, setPicked] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 전에 입력한 값이 있으면 채워 둔다 (한 번만)
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (filled || profile === undefined || active === undefined) return;
    if (profile) {
      setBodyWeight(String(profile.bodyWeight));
      setGoal(profile.goal);
      setDays(profile.days);
      setEquipment(profile.equipment.filter((e) => e !== '맨몸'));
    }
    if (active) {
      setLift(active.plan.baseExerciseId);
      setWeight(String(active.plan.baseWeight));
      setReps(String(active.plan.baseReps));
      setWeeks(active.plan.weeks);
      if (active.plan.templateId) {
        setTemplateId(active.plan.templateId);
        setPicked(true);
      }
    }
    setFilled(true);
  }, [profile, active, filled]);

  const fullEquipment: Equipment[] = [...equipment, '맨몸'];
  const recommended = useMemo(() => recommendTemplates(goal, [...equipment, '맨몸']), [goal, equipment]);
  const template = getTemplate(templateId);

  // 직접 고르기 전에는 조건에 가장 잘 맞는 시안을 따라간다
  useEffect(() => {
    if (!picked && recommended[0] && recommended[0].id !== templateId) chooseTemplate(recommended[0], false);
  }, [recommended, picked]);

  /** 시안을 바꾸면 그 시안의 주당 횟수에 맞게 요일도 맞춘다 */
  function chooseTemplate(t: PlanTemplate, byUser = true) {
    setTemplateId(t.id);
    if (byUser) setPicked(true);
    setDays((d) => (t.sessions.includes(d.length) ? d : DEFAULT_DAYS[t.sessions[0]]));
    setError('');
  }
  const usable = (t: PlanTemplate) => !t.needs.length || t.needs.some((n) => fullEquipment.includes(n));
  const cards = showAll ? TEMPLATES : recommended.some((t) => t.id === templateId) ? recommended : [...recommended, template];

  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const oneRm = epley1RM(w || 0, r || 0);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!(w >= 20 && w <= 400)) return setError('무게는 20~400kg 사이로 입력하세요.');
    if (!(r >= 1 && r <= 20)) return setError('횟수는 1~20회 사이로 입력하세요.');
    const bw = parseFloat(bodyWeight);
    if (!(bw >= 30 && bw <= 250)) return setError('몸무게는 30~250kg 사이로 입력하세요.');
    if (!usable(template)) return setError(`${withJosa(template.name, '은')} ${template.needs.join(', ')}이 있어야 합니다. 다른 시안을 고르세요.`);
    if (!template.sessions.includes(days.length)) return setError(`${withJosa(template.name, '은')} ${sessionsLabel(template)} 운동합니다. 요일을 ${template.sessions.join('일 또는 ')}일 고르세요.`);
    setSaving(true);
    try {
      await createPlan(
        { baseExerciseId: lift, baseWeight: w, baseReps: r, goal, weeks, days, equipment: fullEquipment, startDate: mondayOf(new Date()), templateId },
        bw,
      );
      toast('새 계획을 만들었습니다');
      navigate('/plan');
    } catch (err) {
      console.error(err);
      setError('계획을 저장하지 못했습니다. 다시 눌러 주세요.');
      setSaving(false);
    }
  }

  return (
    <>
      <Band>
        <h1>지금 얼마나 드나요?</h1>
        <p>최근에 든 무게와 횟수만 알면 1RM을 계산해서 목표까지 주차별 계획을 짜 드립니다.</p>
      </Band>
      <form onSubmit={submit} onChange={() => setError('')}>
        <section className="sec">
          <div className={styles.field}>
            <span className={styles.lbl}>기준 운동</span>
            <div className="chips">
              {BASE_LIFTS.map((id) => (
                <button type="button" key={id} className="chip" aria-pressed={id === lift} onClick={() => setLift(id)}>
                  {exMap?.get(id)?.name ?? id}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.lbl} htmlFor="setup-weight">최근에 든 무게와 횟수</label>
            <div className={styles.pair}>
              <input id="setup-weight" className={`${styles.input} num`} type="number" inputMode="decimal" step="2.5" value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="무게 (kg)" />
              <span>kg ×</span>
              <input id="setup-reps" className={`${styles.input} num`} type="number" inputMode="numeric" min={1} max={20} value={reps} onChange={(e) => setReps(e.target.value)} aria-label="횟수" />
              <span>회</span>
            </div>
          </div>
          <div className={styles.result} aria-live="polite">
            <div>
              <b>추정 1RM</b>
              <div className={styles.resultSub}>{r > 0 && !isReliableReps(r) ? '12회가 넘으면 오차가 커서 참고용입니다' : '한 번에 들 수 있는 최대 무게'}</div>
            </div>
            <div>
              <span className={`num ${styles.big}`}>{oneRm || '-'}</span>
              <b>kg</b>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.lbl} htmlFor="setup-bw">현재 몸무게</label>
            <div className={styles.pair} style={{ gridTemplateColumns: '1fr auto' }}>
              <input id="setup-bw" className={`${styles.input} num`} type="number" inputMode="decimal" step="0.1" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} />
              <span>kg</span>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className={styles.field}>
            <span className={styles.lbl}>목표</span>
            <div className="chips">
              {GOALS.map((g) => (
                <button type="button" key={g} className="chip" aria-pressed={g === goal} onClick={() => setGoal(g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.lbl}>쓸 수 있는 기구 (맨몸 운동은 항상 포함)</span>
            <div className="chips">
              {EQUIPMENT.map((q) => (
                <button type="button" key={q} className="chip" aria-pressed={equipment.includes(q)} onClick={() => setEquipment(toggle(equipment, q))}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="sec">
          <div className={styles.head}>
            <h2 className="sec-title">{showAll ? '모든 계획 시안' : '추천 계획 시안'}</h2>
            <button type="button" className="btn sm line" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
              {showAll ? '추천만 보기' : `전체 ${TEMPLATES.length}개 보기`}
            </button>
          </div>
          <div className={styles.cards} role="radiogroup" aria-label="계획 시안">
            {cards.map((t, i) => {
              const ok = usable(t);
              return (
                <button
                  type="button"
                  key={t.id}
                  role="radio"
                  aria-checked={t.id === templateId}
                  disabled={!ok}
                  className={styles.card}
                  onClick={() => chooseTemplate(t)}
                >
                  <span className={styles.cardHead}>
                    <b>{t.name}</b>
                    {!showAll && i === 0 && recommended[0]?.id === t.id && <span className={styles.tag}>잘 맞음</span>}
                  </span>
                  <span className={styles.cardSum}>{t.summary}</span>
                  <span className={styles.cardMeta}>
                    {ok ? `${sessionsLabel(t)} · 하루 ${exerciseCountLabel(t)} · ${t.routines.map((r) => r.name).join(' / ')}` : `${t.needs.join(', ')}이 있어야 합니다`}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.field}>
            <span className={styles.lbl}>
              운동하는 요일 <span className={styles.hint}>{sessionsLabel(template)} · {days.length}일 고름</span>
            </span>
            <div className="chips">
              {WEEK.map((d) => (
                <button type="button" key={d} className="chip" aria-pressed={days.includes(d)} onClick={() => setDays(toggle(days, d))}>
                  {weekdayLabel(d)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.lbl}>계획 기간</span>
            <div className="chips">
              {PERIODS.map((p) => (
                <button type="button" key={p} className="chip" aria-pressed={p === weeks} onClick={() => setWeeks(p)}>
                  {p}주
                </button>
              ))}
            </div>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {active && <p className="sub">새로 만들면 지금 계획은 끝나고, 지난 운동 기록은 그대로 남습니다.</p>}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? '계획 만드는 중' : `${withJosa(template.name, '으로')} 계획 만들기`}
          </button>
        </section>
      </form>
    </>
  );
}
