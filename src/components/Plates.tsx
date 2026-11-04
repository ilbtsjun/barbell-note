import { DEFAULT_BAR, DEFAULT_PLATES, platesPerSide } from '../lib/plates';
import styles from './Plates.module.css';

// 원판 무게별 그림 크기 (높이, 두께)와 색 토큰
const LOOK: Record<string, [number, number, string]> = {
  '25': [46, 11, '--plate-25'],
  '20': [46, 10, '--plate-20'],
  '15': [40, 9, '--plate-15'],
  '10': [34, 8, '--plate-10'],
  '5': [26, 6, '--plate-5'],
  '2.5': [19, 5, '--plate-2'],
  '1.25': [15, 4, '--plate-1'],
};
const lookOf = (w: number) => LOOK[String(w)] ?? [20, 5, '--plate-1'];

/** 봉 한쪽에 끼울 원판 그림과 설명 */
export function Plates({ total, bar = DEFAULT_BAR, plates = DEFAULT_PLATES }: { total: number; bar?: number; plates?: number[] }) {
  const { perSide, remainder } = platesPerSide(total, bar, plates);
  return (
    <div>
      <div className={styles.plates} aria-hidden="true">
        <span className={styles.end} />
        <span className={styles.collar} />
        {perSide.map((w, i) => {
          const [h, t, color] = lookOf(w);
          return <span key={i} className={styles.plate} style={{ height: h, width: t, background: `var(${color})` }} />;
        })}
        <span className={styles.end} style={{ width: 12 }} />
      </div>
      <p className={styles.note}>
        {perSide.length ? `한쪽에 ${perSide.join(' + ')}kg 끼우기 (봉 ${bar}kg)` : `빈 봉 ${bar}kg`}
        {remainder > 0 && ` · 가진 원판으로는 ${remainder}kg 모자랍니다`}
      </p>
    </div>
  );
}
