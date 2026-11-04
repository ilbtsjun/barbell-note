import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './icons';
import styles from './TabBar.module.css';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '오늘', icon: 'today' },
  { to: '/plan', label: '계획', icon: 'plan' },
  { to: '/log', label: '기록', icon: 'log' },
  { to: '/stats', label: '통계', icon: 'stats' },
  { to: '/library', label: '운동', icon: 'search' },
];

/** 현재 탭 위치. 능력 입력(/setup)은 계획 탭에 속한다. */
function activeIndex(pathname: string) {
  if (pathname.startsWith('/setup')) return 1;
  const i = TABS.findIndex((t) => t.to !== '/' && pathname.startsWith(t.to));
  return i === -1 ? 0 : i;
}

export function TabBar() {
  const { pathname } = useLocation();
  const index = activeIndex(pathname);
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; instant: boolean } | null>(null);

  // 노란 표시가 누른 탭으로 미끄러져 간다. 처음 그릴 때와 화면 크기가 바뀔 때는 바로 그 자리에 둔다.
  useLayoutEffect(() => {
    const place = (instant: boolean) => {
      const nav = navRef.current;
      const ic = nav?.querySelectorAll<HTMLElement>(`.${styles.ic}`)[index];
      if (!nav || !ic) return;
      setPill({ x: ic.getBoundingClientRect().left - nav.getBoundingClientRect().left, instant });
    };
    place(pill === null);
    const onResize = () => place(true);
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(() => place(true));
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <nav ref={navRef} className={styles.tabs} aria-label="메인 메뉴">
      {pill && (
        <span
          className={styles.pill}
          data-instant={pill.instant || undefined}
          style={{ transform: `translateX(${pill.x}px)` }}
          aria-hidden="true"
        />
      )}
      {TABS.map((t, i) => (
        <NavLink key={t.to} to={t.to} className={styles.tab} aria-current={i === index ? 'page' : undefined}>
          <span className={styles.ic}>
            <Icon name={t.icon} />
          </span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
