import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';

/** 통계. 4단계에서 몸무게 기록과 그래프, 운동별 1RM 변화가 들어온다. */
export default function Stats() {
  return (
    <>
      <Band>
        <h1>기록이 쌓이면 보여 드릴게요</h1>
        <p>몸무게 변화와 운동별 1RM이 얼마나 올랐는지 한눈에 볼 수 있습니다.</p>
      </Band>
      <EmptyState title="몸무게 그래프와 1RM 변화가 여기에 나타납니다">
        오늘 몸무게를 기록하는 칸도 이 화면에 생깁니다.
      </EmptyState>
    </>
  );
}
