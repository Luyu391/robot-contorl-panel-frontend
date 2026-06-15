import { useState, useEffect, useCallback, useRef } from 'react';
import type { RobotState, RobotStatus } from '../types';

const POLL_INTERVAL = 2000;

export function useRobotStatus() {
  const [state, setState] = useState<RobotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/robot/status');
      if (!res.ok) throw new Error('Status fetch failed');
      const data: RobotState = await res.json();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchStatus]);

  return { state, error, refresh: fetchStatus };
}