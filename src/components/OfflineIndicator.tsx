'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative z-[100] bg-amber-600 text-white px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 overflow-hidden"
    >
      <WifiOff className="w-4 h-4" />
      <span>You're offline. Some content may be unavailable.</span>
    </motion.div>
  );
}
