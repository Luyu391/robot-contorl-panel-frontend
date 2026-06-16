import { useState, useEffect } from 'react';

export interface NetworkStatus {
  online: boolean;
  supported: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState(() => {
    if (typeof window !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  });
  const supported = typeof window !== 'undefined' && 'onLine' in navigator;

  useEffect(() => {
    if (!supported) return;

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [supported]);

  return { online, supported };
}

export default useNetworkStatus;
