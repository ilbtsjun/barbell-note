import { Link } from 'react-router-dom';
import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';

/** 기록. 4단계에서 달력과 최근 운동 목록이 들어온다. */
export default function Log() {
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
