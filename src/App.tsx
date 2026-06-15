import { Suspense, useState, useCallback, lazy } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bot, Settings, HelpCircle, Gamepad2, ClipboardList } from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import { DashboardPage } from './features/dashboard/DashboardPage';
import CommandPanel from './features/command/CommandPanel';
import { ToastProvider, useToast } from './components/Toast';
import { RobotProvider } from './hooks/useRobotContext';
import ExecutionReveal from './features/reveal/ExecutionReveal';
import PageTransition, { type TransitionMode } from './components/PageTransition';
import { useCommandHistory } from './hooks/useCommandHistory';
import { executeCommand } from './lib/robot-api';
import { generateExecutionSummary } from './lib/llm-command-suggest';
import type { CommandRecord } from './types';

const OperationPage = lazy(() => import('./features/operation/OperationPage'));
const DatingPage = lazy(() => import('./features/dating/DatingPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const HelpPage = lazy(() => import('./features/help/HelpPage'));
const PlaygroundPage = lazy(() => import('./features/playground/PlaygroundPage'));

const TRANSITION_FOR: Record<string, TransitionMode> = {
  '/': 'fade',
  '/command': 'push',
  '/playground': 'enter',
  '/operation': 'enter',
  '/dating': 'push',
  '/settings': 'push',
  '/help': 'pop',
};

export default function App() {
  return (
    <ToastProvider>
      <RobotProvider>
        <AppShell />
      </RobotProvider>
    </ToastProvider>
  );
}

function AppShell() {
  const [entered, setEntered] = useState(() => {
    // Skip splash on revisit within session
    return sessionStorage.getItem('openclaw_entered') === '1';
  });

  const handleEnter = useCallback(() => {
    sessionStorage.setItem('openclaw_entered', '1');
    setEntered(true);
  }, []);

  if (!entered) {
    return <SplashScreen onEnter={handleEnter} />;
  }

  return <AppRoutes />;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = TRANSITION_FOR[location.pathname] ?? 'push';
  const { history, addCommand, updateStatus } = useCommandHistory();
  const { addToast } = useToast();
  const [revealData, setRevealData] = useState<{
    rawText: string;
    success: boolean;
    summary: string;
    duration: number;
  } | null>(null);

  const handleExecute = useCallback(
    async (id: string, text: string) => {
      try {
        const parseRes = await fetch('/api/robot/parse', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const parsed = await parseRes.json();
        const result = await executeCommand(text, parsed);
        const summary = await generateExecutionSummary({
          rawText: text,
          success: result.success,
          duration: result.duration,
        });
        setRevealData({ rawText: text, success: result.success, summary, duration: result.duration });
        if (result.success) {
          addToast('success', `指令"${text.slice(0, 20)}..."执行成功`);
        } else {
          addToast('error', `指令执行失败：${result.summary}`);
        }
        return result;
      } catch {
        addToast('error', '网络异常，指令执行失败');
        const result = { success: false, summary: '网络异常，执行失败', duration: 0 };
        setRevealData({ rawText: text, success: false, summary: '网络异常，执行失败', duration: 0 });
        return result;
      }
    },
    [addToast],
  );

  const handleRevealComplete = useCallback(() => setRevealData(null), []);

  const makeDashboardExecute = useCallback(
    (text: string) => {
      const id = `cmd-${Date.now()}`;
      addCommand({ id, rawText: text, status: 'executing', source: 'quick', createdAt: new Date().toISOString() });
      handleExecute(id, text).then((result) => {
        updateStatus(id, result.success ? 'completed' : 'failed', {
          completedAt: new Date().toISOString(),
          duration: result.duration,
          resultSummary: result.summary,
        });
      });
    },
    [addCommand, handleExecute, updateStatus],
  );

  const navigateCommand = useCallback(() => navigate('/command'), [navigate]);

  const isOperation = location.pathname === '/operation';

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className={isOperation ? 'h-[calc(100vh-3.5rem)]' : 'mx-auto w-full max-w-3xl px-4 pb-24 pt-4 md:px-5'}>
        <PageTransition mode={mode} routeKey={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<DashboardPage history={history} onExecute={makeDashboardExecute} onNavigateCommand={navigateCommand} />} />
            <Route path="/command" element={<CommandPanel history={history} onAddCommand={addCommand} onUpdateStatus={updateStatus} onExecute={handleExecute} />} />
            <Route path="/playground" element={<Suspense fallback={<SkeletonShell />}><PlaygroundPage /></Suspense>} />
            <Route path="/operation" element={<Suspense fallback={<SkeletonShell />}><OperationPage /></Suspense>} />
            <Route path="/dating" element={<Suspense fallback={<SkeletonShell />}><DatingPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<SkeletonShell />}><SettingsPage /></Suspense>} />
            <Route path="/help" element={<Suspense fallback={<SkeletonShell />}><HelpPage /></Suspense>} />
            <Route path="*" element={<DashboardPage history={history} onExecute={makeDashboardExecute} onNavigateCommand={navigateCommand} />} />
          </Routes>
        </PageTransition>
      </main>
      {revealData && (
        <ExecutionReveal rawText={revealData.rawText} success={revealData.success} summary={revealData.summary} duration={revealData.duration} onComplete={handleRevealComplete} />
      )}
    </div>
  );
}

function AppHeader() {
  const location = useLocation();
  const mainItems = [
    { to: '/', label: '仪表盘' },
    { to: '/command', label: '指令' },
    { to: '/playground', label: '3D', icon: <Gamepad2 className="h-3 w-3" /> },
    { to: '/dating', label: '方案', icon: <ClipboardList className="h-3 w-3" /> },
  ];
  const secondaryItems = [
    { to: '/settings', label: '设置', icon: <Settings className="h-3.5 w-3.5" /> },
    { to: '/help', label: '帮助', icon: <HelpCircle className="h-3.5 w-3.5" /> },
  ];

  return (
    <header className="glass-strong sticky top-0 z-40 border-b border-white/20">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2.5 md:px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-800">
          <Bot className="h-4 w-4 text-indigo-600" />
          <span className="hidden sm:inline">OpenCLaw Control</span>
        </Link>
        <nav aria-label="主导航" className="flex flex-wrap items-center gap-0.5 text-xs">
          {mainItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined}
                className={active
                  ? 'glass-light rounded-lg px-2.5 py-1.5 font-medium text-indigo-700'
                  : 'rounded-lg px-2.5 py-1.5 text-slate-500 transition hover:bg-white/30 hover:text-slate-700'}>
                {item.icon}{item.label}
              </Link>
            );
          })}
        </nav>
        <nav aria-label="辅助导航" className="hidden sm:flex items-center gap-0.5">
          {secondaryItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} title={item.label}
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition ${active ? 'glass-light font-medium text-indigo-700' : 'text-slate-400 hover:bg-white/30 hover:text-slate-600'}`}>
                {item.icon}<span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function SkeletonShell() {
  return (
    <section className="space-y-4 pt-2">
      <div className="glass rounded-xl p-6">
        <div className="h-4 w-1/3 rounded bg-slate-200/80 animate-pulse" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full rounded bg-slate-100/80 animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-slate-100/80 animate-pulse" />
        </div>
      </div>
      <div className="glass rounded-xl p-6">
        <div className="h-4 w-1/4 rounded bg-slate-200/80 animate-pulse" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="h-20 rounded-lg bg-slate-100/80 animate-pulse" />
          <div className="h-20 rounded-lg bg-slate-100/80 animate-pulse" />
        </div>
      </div>
    </section>
  );
}