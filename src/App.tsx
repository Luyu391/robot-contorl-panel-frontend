import { Suspense, useState, useCallback, lazy } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bot, Settings, HelpCircle, Gamepad2, ClipboardList, Terminal, Home } from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import { LiquidGlassBackground } from './components/LiquidGlass';
import { DashboardPage } from './features/dashboard/DashboardPage';
import CommandPanel from './features/command/CommandPanel';
import { ToastProvider, useToast } from './components/Toast';
import { RobotProvider } from './hooks/useRobotContext';
import { OfflineProvider } from './contexts/OfflineContext';
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
    <OfflineProvider>
      <ToastProvider>
        <RobotProvider>
          <AppShell />
        </RobotProvider>
      </ToastProvider>
    </OfflineProvider>
  );
}

function AppShell() {
  const [entered, setEntered] = useState(() => {
    return sessionStorage.getItem('openrobot_entered') === '1';
  });

  const handleEnter = useCallback(() => {
    sessionStorage.setItem('openrobot_entered', '1');
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
    <div className="min-h-screen relative">
      <LiquidGlassBackground />
      <div className="relative z-10">
        <AppHeader />
        <main className={isOperation ? 'h-[calc(100vh-3.5rem)]' : 'mx-auto w-full max-w-4xl px-4 pb-24 pt-4 md:px-6'}>
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
      </div>
      {revealData && (
        <ExecutionReveal rawText={revealData.rawText} success={revealData.success} summary={revealData.summary} duration={revealData.duration} onComplete={handleRevealComplete} />
      )}
    </div>
  );
}

function AppHeader() {
  const location = useLocation();
  const mainItems = [
    { to: '/', label: '控制面板', icon: <Home className="h-3.5 w-3.5" /> },
    { to: '/command', label: '指令', icon: <Terminal className="h-3.5 w-3.5" /> },
    { to: '/playground', label: '3D操控', icon: <Gamepad2 className="h-3.5 w-3.5" /> },
    { to: '/dating', label: '方案推荐', icon: <ClipboardList className="h-3.5 w-3.5" /> },
  ];
  const secondaryItems = [
    { to: '/settings', label: '设置', icon: <Settings className="h-3.5 w-3.5" /> },
    { to: '/help', label: '帮助', icon: <HelpCircle className="h-3.5 w-3.5" /> },
  ];

  return (
    <header className="glass-strong sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white glow-text">OpenRobot</span>
            <span className="text-[10px] text-white/40 -mt-0.5">智能机械臂控制</span>
          </div>
        </Link>

        <nav aria-label="主导航" className="flex flex-1 justify-center">
          <div className="flex items-center gap-1">
            {mainItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                  }`}>
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                  {active && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-pulse-glow" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <nav aria-label="辅助导航" className="hidden sm:flex items-center gap-1">
          {secondaryItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} title={item.label}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-all duration-300 ${
                  active
                    ? 'bg-white/[0.08] text-indigo-300'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                }`}>
                {item.icon}
                <span className="hidden md:inline">{item.label}</span>
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
      <div className="glass p-6 rounded-2xl">
        <div className="h-4 w-1/3 rounded bg-white/[0.08] animate-pulse" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full rounded bg-white/[0.05] animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-white/[0.05] animate-pulse" />
        </div>
      </div>
      <div className="glass p-6 rounded-2xl">
        <div className="h-4 w-1/4 rounded bg-white/[0.08] animate-pulse" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="h-20 rounded-xl bg-white/[0.05] animate-pulse" />
          <div className="h-20 rounded-xl bg-white/[0.05] animate-pulse" />
        </div>
      </div>
    </section>
  );
}