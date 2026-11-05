import { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useBackGuard } from './components/BackGuard';
import { TabBar } from './components/TabBar';
import { ToastProvider } from './components/Toast';
import { UpdatePrompt } from './components/UpdatePrompt';
import styles from './App.module.css';

const Today = lazy(() => import('./pages/Today'));
const Plan = lazy(() => import('./pages/Plan'));
const Setup = lazy(() => import('./pages/Setup'));
const Log = lazy(() => import('./pages/Log'));
const Stats = lazy(() => import('./pages/Stats'));
const Library = lazy(() => import('./pages/Library'));
const Me = lazy(() => import('./pages/Me'));

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </HashRouter>
  );
}

function Shell() {
  const { location, dialog } = useBackGuard();
  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <Suspense fallback={null}>
          <Routes location={location}>
            <Route path="/" element={<Today />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/log" element={<Log />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/library" element={<Library />} />
            <Route path="/me" element={<Me />} />
            <Route path="*" element={<Today />} />
          </Routes>
        </Suspense>
      </main>
      <TabBar pathname={location.pathname} />
      <UpdatePrompt />
      {dialog}
    </div>
  );
}
