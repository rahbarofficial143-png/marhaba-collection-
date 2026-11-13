import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#4B0013] border border-[#FECE57]/60 px-4 py-2 text-xs font-semibold text-white shadow-xl"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#FECE57] shrink-0" />
      <span>Offline mode — showing cached catalog. Live updates resume online.</span>
    </div>
  );
};
