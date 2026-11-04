import type { ReactNode } from 'react';
import styles from './Band.module.css';

/** 화면마다 맨 위에 놓이는 노란 띠. 화면의 주인공 문장(h1)을 담는다. */
export function Band({ children }: { children: ReactNode }) {
  return (
    <header className={styles.band}>
      <div className={styles.top}>
        <span className={styles.logo}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M2 12h20M6 7v10M18 7v10M4 9v6M20 9v6" />
          </svg>
          바벨노트
        </span>
      </div>
      {children}
    </header>
  );
}
