import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Band } from '../components/Band';
import { DataSection } from '../components/DataSection';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { useExerciseMap, usePlans, useProfile } from '../db/hooks';
import { activatePlan, DEFAULT_PROFILE, deletePlan, renamePlan, saveProfile } from '../db/planRepo';
import { saveBodyWeight } from '../db/recordRepo';
import type { Equipment, Goal, Plan } from '../db/types';
import { fromISODate, toISODate, weekNumber, weekdayLabel } from '../lib/dates';
import { josa } from '../lib/korean';
import { planName, templateName } from '../lib/templates';
import styles from './Me.module.css';

const GOALS: Goal[] = ['근력', '근비대', '체중 감량'];
const EQUIPMENT: Equipment[] = ['바벨', '덤벨', '머신', '케이블'];
const order = (d: number) => (d === 0 ? 7 : d);
const md = (iso: string) => {
  const d = fromISODate(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};
const daysLabel = (days?: number[]) => (days?.length ? [...days].sort((a, b) => order(a) - order(b)).map(weekdayLabel).join('·') : '');

/** 내 정보: 몸무게·목표·기구, 내 계획 관리, 운동 목록, 백업 */
export default function Me() {
  const profile = useProfile();
  const plans = usePlans();
  const exMap = useExerciseMap();
  const toast = useToast();
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  if (profile === undefined || plans === undefined) return null;

  const me = profile ?? DEFAULT_PROFILE;
  const active = plans.find((p) => p.active);
  const saved = plans.filter((p) => !p.active);
  const open = plans.find((p) => p.id === openId);
  const liftName = (p: Plan) => exMap?.get(p.baseExerciseId)?.name ?? '';

  async function save(patch: Parameters<typeof saveProfile>[0], message: string) {
    try {
      await saveProfile(patch);
      toast(message);
    } catch (err) {
      console.error(err);
      toast('저장하지 못했습니다. 다시 눌러 주세요');
    }
  }

  async function submitWeight(ev: FormEvent) {
    ev.preventDefault();
    const v = parseFloat(weight);
    if (!(v >= 30 && v <= 250)) return setError('몸무게는 30~250kg 사이로 입력하세요.');
    try {
      await saveProfile({});
      await saveBodyWeight(toISODate(new Date()), v);
      setWeight('');
      toast(`몸무게를 ${Math.round(v * 10) / 10}kg으로 바꿨습니다`);
    } catch (err) {
      console.error(err);
      setError('저장하지 못했습니다. 다시 눌러 주세요.');
    }
  }

  function toggleEquipment(q: Equipment) {
    const list = me.equipment.includes(q) ? me.equipment.filter((e) => e !== q) : [...me.equipment, q];
    save({ equipment: list.includes('맨몸') ? list : [...list, '맨몸'] }, '쓸 수 있는 기구를 바꿨습니다');
  }

  return (
    <>
      <Band>
        <h1>내 정보</h1>
        <p>
          몸무게 {me.bodyWeight}kg · {me.goal}
          {active ? ` · ${planName(active)}` : ''}
        </p>
      </Band>

      <section className="sec">
        <h2 className="sec-title">내 몸과 목표</h2>
        <form className={styles.wtForm} onSubmit={submitWeight} noValidate>
          <label className={styles.lbl} htmlFor="me-weight">
            몸무게
          </label>
          <input
            id="me-weight"
            className={`num ${styles.input}`}
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder={`${me.bodyWeight}`}
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              setError('');
            }}
          />
          <span className={styles.unit}>kg</span>
          <button className="btn sm" type="submit" disabled={!weight}>
            바꾸기
          </button>
        </form>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.field}>
          <span className={styles.lbl}>목표</span>
          <div className="chips">
            {GOALS.map((g) => (
              <button type="button" key={g} className="chip" aria-pressed={g === me.goal} onClick={() => g !== me.goal && save({ goal: g }, `목표를 ${josa(g, '으로')} 바꿨습니다`)}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.lbl}>쓸 수 있는 기구</span>
          <div className="chips">
            {EQUIPMENT.map((q) => (
              <button type="button" key={q} className="chip" aria-pressed={me.equipment.includes(q)} onClick={() => toggleEquipment(q)}>
                {q}
              </button>
            ))}
          </div>
          <span className="sub">목표와 기구는 다음에 계획을 만들거나 고칠 때 반영됩니다. 몸무게는 유산소 칼로리 계산에 씁니다.</span>
        </div>
      </section>

      <section className="sec">
        <h2 className="sec-title">내 계획</h2>
        {active ? (
          <div className={styles.current}>
            <span className={styles.tag}>지금 하는 계획</span>
            <b className={styles.planName}>{planName(active)}</b>
            <span className="sub">
              {active.name ? `${templateName(active.templateId)} · ` : ''}
              {active.weeks}주 중 {Math.min(weekNumber(active.startDate), active.weeks)}주차
              {active.days ? ` · ${daysLabel(active.days)}` : ''}
            </span>
            <span className="sub">
              {liftName(active)} 1RM {active.start1RM} → {active.target1RM}kg
            </span>
            <div className={styles.row}>
              <Link to="/setup?mode=edit" className="btn sm">
                계획 고치기
              </Link>
              <button type="button" className="btn sm line" onClick={() => setOpenId(active.id ?? null)}>
                이름 바꾸기
              </button>
            </div>
          </div>
        ) : (
          <p className="sub">아직 하는 계획이 없습니다.</p>
        )}
        <Link to="/setup" className="btn line">
          새 계획 만들기
        </Link>
        {active && <p className="sub">새로 만들어도 지금 계획은 아래 목록에 남아서 언제든 다시 바꿀 수 있습니다.</p>}

        {saved.length > 0 && (
          <div>
            <h3 className={styles.subTitle}>저장한 계획</h3>
            {saved.map((p) => (
              <button type="button" key={p.id} className={styles.planRow} onClick={() => setOpenId(p.id ?? null)}>
                <span>
                  <b>{planName(p)}</b>
                  <span className="sub">
                    {p.weeks}주 · {daysLabel(p.days) || templateName(p.templateId)} · {liftName(p)} {p.target1RM}kg 목표
                  </span>
                </span>
                <span className={styles.go}>관리</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="sec">
        <Link to="/library" className={styles.planRow}>
          <span>
            <b>운동 목록</b>
            <span className="sub">{exMap ? `${exMap.size}종 · ` : ''}자세 설명 보기, 내 운동 추가</span>
          </span>
          <span className={styles.go}>보기</span>
        </Link>
      </section>

      <DataSection />

      {open && <PlanSheet key={open.id} plan={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

/** 계획 하나: 이름 바꾸기, 이 계획으로 바꾸기, 지우기 */
function PlanSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(plan.name ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const changed = name.trim() !== (plan.name ?? '');

  async function run(fn: () => Promise<void>, ok: string, fail: string, close = true) {
    try {
      await fn();
      toast(ok);
      if (close) onClose();
    } catch (err) {
      console.error(err);
      toast(fail);
    }
  }

  return (
    <Sheet label={`${planName(plan)} 관리`} onClose={onClose}>
      <div>
        <h2 className={styles.sheetTitle}>{planName(plan)}</h2>
        <span className="sub">
          {templateName(plan.templateId)} · {plan.weeks}주{plan.days ? ` · ${daysLabel(plan.days)}` : ''} · {md(plan.startDate)} 시작
        </span>
      </div>
      <form
        className={styles.nameForm}
        onSubmit={(ev) => {
          ev.preventDefault();
          if (changed) run(() => renamePlan(plan.id!, name), '이름을 바꿨습니다', '이름을 바꾸지 못했습니다', false);
        }}
      >
        <label className={styles.lbl} htmlFor="plan-name">
          이름
        </label>
        <input id="plan-name" className={styles.text} maxLength={30} placeholder={templateName(plan.templateId)} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn sm" disabled={!changed}>
          저장
        </button>
      </form>
      {!plan.active && (
        <>
          <button type="button" className="btn" onClick={() => run(() => activatePlan(plan.id!), '이 계획으로 바꿨습니다. 이번 주가 1주차입니다', '계획을 바꾸지 못했습니다')}>
            이 계획으로 바꾸기
          </button>
          <p className="sub">이번 주부터 1주차로 다시 시작합니다. 지금 계획은 목록에 남습니다.</p>
          <button
            type="button"
            className={`btn line ${styles.danger}`}
            data-confirm={confirmDelete || undefined}
            onClick={() => (confirmDelete ? run(() => deletePlan(plan.id!), '계획을 지웠습니다', '계획을 지우지 못했습니다') : setConfirmDelete(true))}
          >
            {confirmDelete ? '한 번 더 누르면 지웁니다' : '이 계획 지우기'}
          </button>
        </>
      )}
    </Sheet>
  );
}
