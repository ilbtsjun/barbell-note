import type { ReactNode } from 'react';

/** 아직 데이터가 없을 때: 무엇이 나타날지와 첫 행동을 알려준다. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <section className="sec" style={{ borderBottom: 0, gap: 14 }}>
      <h2 className="sec-title">{title}</h2>
      {children && <p className="sub">{children}</p>}
      {action}
    </section>
  );
}
