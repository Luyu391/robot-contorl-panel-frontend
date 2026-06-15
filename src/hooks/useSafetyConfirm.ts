import { useState, useCallback } from 'react';

export function useSafetyConfirm() {
  const [pending, setPending] = useState(false);
  const [resolveRef, setResolveRef] = useState<((ok: boolean) => void) | null>(null);

  const requestConfirm = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending(true);
      setResolveRef(() => resolve);
    });
  }, []);

  const confirm = useCallback(() => {
    setPending(false);
    resolveRef?.(true);
    setResolveRef(null);
  }, [resolveRef]);

  const cancel = useCallback(() => {
    setPending(false);
    resolveRef?.(false);
    setResolveRef(null);
  }, [resolveRef]);

  return { pending, requestConfirm, confirm, cancel };
}