import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showStatusChanged, setShowStatusChanged] = useState(false);

  useEffect(() => {
    // Only show a temporary notice when we go back online
    if (isOnline) {
      setShowStatusChanged(true);
      const timer = setTimeout(() => setShowStatusChanged(false), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowStatusChanged(true);
    }
  }, [isOnline]);

  if (!showStatusChanged && isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-bounce">
      {!isOnline ? (
        <div className="flex items-center gap-2 rounded-xl bg-amber-950/90 border border-amber-800/60 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-amber-300 shadow-2xl shadow-black/80 backdrop-blur-md">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          Offline Mode — Local Sandbox Active
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-950/90 border border-emerald-800/60 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-emerald-300 shadow-2xl shadow-black/80 backdrop-blur-md">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          Internet connection restored
        </div>
      )}
    </div>
  );
};
