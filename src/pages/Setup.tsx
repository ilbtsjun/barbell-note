import { Band } from '../components/Band';
import { EmptyState } from '../components/EmptyState';

/** 능력 입력. 2단계에서 기준 기록, 추정 1RM, 목표, 요일, 기구, 기간 입력이 들어온다. */
export default function Setup() {
  return (
    <>
      <Band>
        <h1>지금 얼마나 드나요?</h1>
        <p>최근에 든 무게와 횟수만 알면 1RM을 계산해서 목표까지 주차별 계획을 짜 드립니다.</p>
      </Band>
      <EmptyState title="입력 화면을 준비하고 있어요">
        다음 업데이트에서 기록을 넣고 계획을 만들 수 있습니다.
      </EmptyState>
    </>
  );
}
