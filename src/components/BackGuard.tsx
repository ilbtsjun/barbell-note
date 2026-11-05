import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, type Location } from 'react-router-dom';
import { popBackHandler } from '../lib/backStack';
import { useToast } from './Toast';

const href = (l: Location) => l.pathname + l.search + l.hash;
/** 홈 화면에 설치한 앱으로 열었는지 */
const installed = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isGuard = (l: Location) => !!(l.state as { exitGuard?: boolean } | null)?.exitGuard;
/** 이 시간 안에 뒤로 가기를 한 번 더 누르면 종료된다 */
const EXIT_WINDOW_MS = 2000;

/**
 * 휴대폰 뒤로 가기 처리.
 * - 열린 창이 있으면 그 창만 닫는다.
 * - 설치한 앱에서는 첫 화면 아래에 '종료 확인' 자리를 하나 깔아 둔다. 거기까지 돌아오면
 *   "한 번 더 누르면 종료됩니다"를 띄우고, 그 사이 한 번 더 누르면 앱이 닫힌다.
 *   웹 앱은 스스로 창을 닫을 수 없어서, 종료는 휴대폰의 뒤로 가기로만 할 수 있다.
 * 화면은 shown(마지막으로 보여 준 위치)으로 그려서, 뒤로 갔다가 다시 돌아오는 동안 화면이 바뀌지 않게 한다.
 */
export function useBackGuard() {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const [shown, setShown] = useState(location);
  const toast = useToast();
  const [asking, setAsking] = useState(false);
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
      setAsking(true);
      toast('뒤로 가기를 한 번 더 누르면 종료됩니다');
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

  // 시간이 지나거나 화면을 만지면 종료하지 않고 원래 화면으로 돌아간다
  const shownRef = useRef(shown);
  shownRef.current = shown;
  useEffect(() => {
    if (!asking) return;
    const stay = () => {
      setAsking(false);
      navigate(href(shownRef.current), { state: shownRef.current.state });
    };
    const timer = window.setTimeout(stay, EXIT_WINDOW_MS);
    document.addEventListener('pointerdown', stay, { capture: true, once: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', stay, { capture: true });
    };
  }, [asking, navigate]);

  return { location: shown };
}
