import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './icons';
import styles from './TabBar.module.css';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '오늘', icon: 'today' },
  { to: '/plan', label: '계획', icon: 'plan' },
  { to: '/log', label: '기록', icon: 'log' },
  { to: '/stats', label: '통계', icon: 'stats' },
  { to: '/me', label: '내 정보', icon: 'me' },
];

/** 현재 탭 위치. 능력 입력(/setup)은 계획 탭, 운동 목록(/library)은 내 정보 탭에 속한다. */
function activeIndex(pathname: string) {
  if (pathname.startsWith('/setup')) return 1;
  if (pathname.startsWith('/library')) return 4;
  const i = TABS.findIndex((t) => t.to !== '/' && pathname.startsWith(t.to));
  return i === -1 ? 0 : i;
}

/** 아래 탭. 탭끼리 오가는 것은 뒤로 가기 기록에 쌓지 않는다. */
export function TabBar({ pathname }: { pathname: string }) {
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
        <NavLink key={t.to} to={t.to} replace className={styles.tab} aria-current={i === index ? 'page' : undefined}>
          <span className={styles.ic}>
            <Icon name={t.icon} />
          </span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
