import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { RobotState } from '../types';
import { useOffline } from '../contexts/OfflineContext';

const POLL_INTERVAL = 2000;

const FALLBACK_STATE: RobotState = {
  status: 'idle',
  joints: { j1: 0, j2: -30, j3: 45, j4: -15, j5: 90, j6: 0 },
  pose: { x: 320.5, y: -88.2, z: 200.0, roll: 0, pitch: 45, yaw: 0 },
  gripper: 'open',
  speed: 50,
  lastUpdate: new Date().toISOString(),
};

interface RobotContextValue {
  state: RobotState | null;
  error: string | null;
  refresh: () => void;
  isOffline: boolean;
}

const RobotCtx = createContext<RobotContextValue>({
  state: FALLBACK_STATE,
  error: null,
  refresh: () => {},
  isOffline: false,
});

export function useRobotContext() {
  return useContext(RobotCtx);
}

export function RobotProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RobotState | null>(FALLBACK_STATE);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const failCountRef = useRef(0);
  const { isOffline } = useOffline();

  const fetchStatus = useCallback(async (signal: AbortSignal) => {
    if (isOffline) return;

    try {
      const res = await fetch('/api/robot/status', { signal });
      if (!res.ok) throw new Error('Status fetch failed');
      const data: RobotState = await res.json();
      setState(data);
      setError(null);
      failCountRef.current = 0;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      failCountRef.current += 1;
      if (failCountRef.current >= 3) {
        setState(FALLBACK_STATE);
      }
    }
  }, [isOffline]);

  useEffect(() => {
    if (isOffline) {
      setState(FALLBACK_STATE);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;

    fetchStatus(ac.signal);
    const timer = setInterval(() => fetchStatus(ac.signal), POLL_INTERVAL);

    return () => {
      ac.abort();
      clearInterval(timer);
    };
  }, [fetchStatus, isOffline]);

  const refresh = useCallback(() => {
    if (isOffline) return;
    failCountRef.current = 0;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    fetchStatus(ac.signal);
  }, [fetchStatus, isOffline]);

  return (
    <RobotCtx.Provider value={{ state, error, refresh, isOffline }}>
      {children}
    </RobotCtx.Provider>
  );
}