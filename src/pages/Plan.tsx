import { Link } from 'react-router-dom';
import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';

/** 계획. 2단계에서 1RM, 목표, 주차별 작업 무게, 주간 일정이 들어온다. */
export default function Plan() {
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
