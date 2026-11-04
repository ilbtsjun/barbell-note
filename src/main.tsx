import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { seedExercises } from './db/seed';
import './styles/global.css';

// 처음 실행하거나 앱이 업데이트되면 기본 운동 목록을 채운다.
seedExercises().catch((err) => console.error('운동 목록을 불러오지 못했습니다', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
