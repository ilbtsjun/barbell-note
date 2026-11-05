import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, type Location } from 'react-router-dom';
import { popBackHandler } from '../lib/backStack';
import { Sheet } from './Sheet';
import styles from './BackGuard.module.css';

const href = (l: Location) => l.pathname + l.search + l.hash;
/** 홈 화면에 설치한 앱으로 열었는지 */
const installed = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isGuard = (l: Location) => !!(l.state as { exitGuard?: boolean } | null)?.exitGuard;

/**
 * 휴대폰 뒤로 가기 처리.
 * - 열린 창이 있으면 그 창만 닫는다.
 * - 설치한 앱에서는 첫 화면 아래에 '종료 확인' 자리를 하나 깔아 두고, 거기까지 돌아오면 종료할지 묻는다.
 * 화면은 shown(마지막으로 보여 준 위치)으로 그려서, 뒤로 갔다가 다시 돌아오는 동안 화면이 바뀌지 않게 한다.
 */
export function useBackGuard() {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const [shown, setShown] = useState(location);
  const [asking, setAsking] = useState(false);
  const [closeFailed, setCloseFailed] = useState(false);
  const seen = useRef<string | null>(null);

  useLayoutEffect(() => {
    // 같은 위치를 두 번 처리하지 않는다 (개발 모드에서는 효과가 두 번 돈다)
    if (seen.current === location.key) return;
    const first = seen.current === null;
    seen.current = location.key;
    // 처음 열 때 한 번: 지금 화면 아래에 종료 확인 자리를 만든다
    if (first) {
      if (installed()) {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (isGuard(location)) navigate(href(location));
        else if (idx === 0) {
          navigate(href(location), { replace: true, state: { exitGuard: true } });
          navigate(href(location));
        }
      }
      return;
    }
    if (!isGuard(location)) setAsking(false);
    if (navType !== 'POP') {
      if (!isGuard(location)) setShown(location);
      return;
    }
    // 뒤로 가기: 열린 창부터 닫고 원래 화면으로 되돌린다
    if (popBackHandler()) {
      navigate(href(shown), { state: shown.state });
      return;
    }
    if (isGuard(location)) {
      setCloseFailed(false);
      setAsking(true);
      return;
    }
    // 같은 화면이 두 번 쌓여 있으면 한 번 더 뒤로
    if (location.pathname === shown.pathname) {
      navigate(-1);
      return;
    }
    setShown(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  function stay() {
    setAsking(false);
    navigate(href(shown), { state: shown.state });
  }

  function quit() {
    window.close();
    // 창을 닫을 수 없는 환경이면 뒤로 가기로 종료하도록 안내한다
    window.setTimeout(() => setCloseFailed(true), 300);
  }

  const dialog = asking ? (
    <Sheet label="앱 종료" onClose={stay}>
      <h2 className="sec-title">앱을 종료할까요?</h2>
      <p className={styles.sub} data-strong={closeFailed || undefined}>
        {closeFailed ? '뒤로 가기를 한 번 더 누르면 종료됩니다.' : '뒤로 가기를 한 번 더 눌러도 종료됩니다.'}
      </p>
      <div className={styles.row}>
        <button type="button" className="btn line" onClick={stay}>
          취소
        </button>
        <button type="button" className="btn" onClick={quit}>
          종료
        </button>
      </div>
    </Sheet>
  ) : null;

  return { location: shown, dialog };
}
