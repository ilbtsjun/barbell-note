/**
 * 휴대폰 뒤로 가기로 닫을 창 목록. 열린 창(Sheet)이 스스로 올리고 내린다.
 * 뒤로 가기를 누르면 맨 위 창부터 닫는다.
 */
const stack: (() => void)[] = [];

export function pushBackHandler(fn: () => void) {
  stack.push(fn);
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** 맨 위 창을 닫는다. 닫을 창이 없으면 false */
export function popBackHandler() {
  const fn = stack[stack.length - 1];
  if (!fn) return false;
  fn();
  return true;
}
