import { useState, useCallback } from 'react';
import type { CommandRecord, CommandStatus, SafetyCheck } from '../types';

export function useCommandHistory() {
  const [history, setHistory] = useState<CommandRecord[]>([]);
  const [current, setCurrent] = useState<CommandRecord | null>(null);

  const addCommand = useCallback((record: CommandRecord) => {
    setHistory((prev) => [record, ...prev].slice(0, 50));
    setCurrent(record);
  }, []);

  const updateStatus = useCallback((id: string, status: CommandStatus, extra?: Partial<CommandRecord>) => {
    setHistory((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, ...extra } : c))
    );
    setCurrent((prev) => (prev?.id === id ? { ...prev, status, ...extra } : prev));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrent(null);
  }, []);

  return { history, current, addCommand, updateStatus, clearHistory };
}