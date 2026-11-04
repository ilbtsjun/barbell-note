import { fromISODate } from '../lib/dates';
import styles from './LineChart.module.css';

export interface ChartPoint {
  /** 'YYYY-MM-DD' */
  date: string;
  value: number;
}

interface Props {
  points: ChartPoint[];
  label: string;
  /** 점선으로 그릴 목표값 */
  target?: number;
  unit?: string;
}

const W = 340;
const H = 180;
const L = 30;
const R = 46;
const T = 12;
const B = 24;

/** 눈금 간격: 범위를 4칸 안팎으로 나누는 1, 2, 5의 배수 */
function niceStep(range: number) {
  const raw = range / 4 || 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

const fmt = (v: number) => String(Math.round(v * 10) / 10);
const md = (iso: string) => {
  const d = fromISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** 날짜별 값 그래프 (몸무게, 1RM). 직접 그린 SVG. */
export function LineChart({ points, label, target, unit = 'kg' }: Props) {
  if (!points.length) return null;
  const values = points.map((p) => p.value).concat(target ?? []);
  const step = niceStep(Math.max(...values) - Math.min(...values));
  const lo = Math.floor(Math.min(...values) / step) * step - (Math.max(...values) === Math.min(...values) ? step : 0);
  const hi = Math.ceil(Math.max(...values) / step) * step + (Math.max(...values) === Math.min(...values) ? step : 0);
  const t0 = fromISODate(points[0].date).getTime();
  const t1 = fromISODate(points[points.length - 1].date).getTime();
  const x = (iso: string) => (points.length === 1 ? (L + W - R) / 2 : L + ((fromISODate(iso).getTime() - t0) / (t1 - t0 || 1)) * (W - L - R));
  const y = (v: number) => T + ((hi - v) / (hi - lo || 1)) * (H - T - B);

  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  // 날짜 눈금: 처음, 가운데, 마지막
  const dateTicks = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1].map((i) => points[i].date))];
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const last = points[points.length - 1];

  return (
    <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${fmt(points[0].value)}${unit}에서 ${fmt(last.value)}${unit}`}>
      {points.length > 1 && <path className={styles.area} d={`${path}L${x(last.date)},${H - B}L${x(points[0].date)},${H - B}Z`} />}
      {ticks.map((v) => (
        <g key={v}>
          <line className={styles.grid} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
          <text x={L - 6} y={y(v) + 4} textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ))}
      {dateTicks.map((d) => (
        <text key={d} x={x(d)} y={H - 6} textAnchor="middle">
          {md(d)}
        </text>
      ))}
      {target !== undefined && (
        <g>
          <line className={styles.target} x1={L} x2={W - R} y1={y(target)} y2={y(target)} />
          <text className={styles.targetLbl} x={W - R + 6} y={y(target) + 4}>
            목표 {fmt(target)}
          </text>
        </g>
      )}
      <path className={styles.line} d={path} />
      <circle className={styles.dot} cx={x(last.date)} cy={y(last.value)} r={5} />
      <text className={styles.end} x={x(last.date) + 8} y={y(last.value) + 5}>
        {fmt(last.value)}
      </text>
    </svg>
  );
}
