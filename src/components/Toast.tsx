import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

const ToastContext = createContext<(msg: string) => void>(() => {});

/** 저장, 추가처럼 눈에 안 보이는 결과를 짧게 알려준다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 1900);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.toast} role="status" hidden={!msg} key={msg ?? ''}>
        {msg}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
