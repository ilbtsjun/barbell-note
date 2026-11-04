import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Sheet.module.css';

/** 아래에서 올라오는 창. 바깥을 누르거나 Esc를 누르면 닫힌다. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button, input')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={styles.back} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={styles.sheet} role="dialog" aria-modal="true" aria-label={label}>
        <span className={styles.grip} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
