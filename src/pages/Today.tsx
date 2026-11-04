import { Link } from 'react-router-dom';
import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';
import { koreanDate } from '../lib/dates';

/** 오늘의 운동. 3단계에서 계획의 오늘 루틴, 세트 표, 휴식 타이머가 들어온다. */
export default function Today() {
  return (
    <>
      <Band>
        <p>{koreanDate(new Date())}</p>
        <h1>오늘 할 운동이 아직 없어요</h1>
        <p>최근에 든 무게를 알려주시면 계획을 짜서 여기에 매일 할 운동을 띄워 드립니다.</p>
      </Band>
      <EmptyState
        title="계획부터 만들어요"
        action={<Link to="/setup" className="btn">내 운동능력 입력하기</Link>}
      >
        기준 운동 하나의 무게와 횟수, 운동하는 요일만 있으면 됩니다.
      </EmptyState>
    </>
  );
}
