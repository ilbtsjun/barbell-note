import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, type FormEvent } from 'react';
import { Band } from '../components/Band';
import { Icon } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { db } from '../db/schema';
import type { BodyPart, Equipment, Exercise } from '../db/types';
import styles from './Library.module.css';

const PARTS: BodyPart[] = ['가슴', '등', '하체', '어깨', '팔', '코어'];
const EQUIPMENT: Equipment[] = ['바벨', '덤벨', '머신', '케이블', '맨몸'];

export default function Library() {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const [part, setPart] = useState<BodyPart | '전체'>('전체');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim();
    const list = (exercises ?? []).filter(
      (e) => (part === '전체' || e.part === part) && (!q || e.name.includes(q) || e.equipment.includes(q)),
    );
    return PARTS.map((p) => [p, list.filter((e) => e.part === p).sort((a, b) => a.name.localeCompare(b.name, 'ko'))] as const).filter(
      ([, items]) => items.length,
    );
  }, [exercises, part, query]);

  return (
    <>
      <Band>
        <h1>어떤 운동을 찾나요?</h1>
        <div className={styles.search}>
          <Icon name="search" size={18} stroke={2.2} />
          <input
            id="library-search"
            className={styles.input}
            type="search"
            placeholder="이름이나 기구로 검색 (예: 덤벨)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="운동 검색"
          />
        </div>
      </Band>

      <div className="sec" style={{ paddingBottom: 6, borderBottom: 0 }}>
        <div className="chips scroll" role="group" aria-label="부위">
          {(['전체', ...PARTS] as const).map((p) => (
            <button key={p} className="chip" aria-pressed={p === part} onClick={() => setPart(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        {exercises && !groups.length && (
          <p className={`sub ${styles.none}`}>찾는 운동이 없습니다. 다른 이름으로 찾거나 아래에서 직접 추가하세요.</p>
        )}
        {groups.map(([p, items]) => (
          <div key={p}>
            <div className={styles.groupH}>
              {p} · {items.length}
            </div>
            {items.map((e) => (
              <button key={e.id} className={styles.item} onClick={() => setOpen(e)}>
                <span className={styles.name}>{e.name}</span>
                <span className={styles.meta}>
                  {e.equipment}
                  {e.custom ? ' · 직접 추가' : ''}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="sec" style={{ borderBottom: 0 }}>
        <button className="btn line" onClick={() => setAdding(true)}>
          운동 직접 추가하기
        </button>
      </div>

      {open && <ExerciseSheet exercise={open} onClose={() => setOpen(null)} />}
      {adding && <AddExerciseSheet onClose={() => setAdding(false)} />}
    </>
  );
}

function ExerciseSheet({ exercise: e, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <Sheet label={e.name} onClose={onClose}>
      <div>
        <h2 className={styles.sheetTitle}>{e.name}</h2>
        <span className="sub">
          {e.part} · {e.equipment}
        </span>
      </div>
      {e.steps.length > 0 && (
        <ol className={styles.steps}>
          {e.steps.map((s) => (
            <li key={s}>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
      <button className="btn line" onClick={onClose}>
        닫기
      </button>
    </Sheet>
  );
}

function AddExerciseSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [part, setPart] = useState<BodyPart>('가슴');
  const [equipment, setEquipment] = useState<Equipment>('덤벨');
  const [error, setError] = useState('');

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const n = name.trim();
    if (!n) return setError('운동 이름을 입력하세요.');
    if (await db.exercises.filter((x) => x.name === n).count()) return setError(`'${n}'은(는) 이미 목록에 있습니다.`);
    await db.exercises.add({ id: `custom-${Date.now()}`, name: n, part, equipment, barbell: equipment === '바벨', steps: [], custom: true });
    toast(`${n}을(를) 운동 목록에 추가했습니다`);
    onClose();
  }

  return (
    <Sheet label="운동 직접 추가" onClose={onClose}>
      <h2 className={styles.sheetTitle}>운동 직접 추가</h2>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          <span>이름</span>
          <input id="add-name" className={styles.textInput} value={name} onChange={(e) => (setName(e.target.value), setError(''))} placeholder="예: 스미스 머신 스쿼트" />
        </label>
        <div className={styles.field}>
          <span>부위</span>
          <div className="chips">
            {PARTS.map((p) => (
              <button type="button" key={p} className="chip" aria-pressed={p === part} onClick={() => setPart(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <span>기구</span>
          <div className="chips">
            {EQUIPMENT.map((q) => (
              <button type="button" key={q} className="chip" aria-pressed={q === equipment} onClick={() => setEquipment(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className="btn" type="submit">
          목록에 추가
        </button>
      </form>
    </Sheet>
  );
}
