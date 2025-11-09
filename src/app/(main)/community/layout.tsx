'use client';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';
import { notFound, usePathname } from 'next/navigation';

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { can, loading } = useAuthStore();
  const pathname = usePathname();

  // Use a specific permission for community access. This is more robust.
  // This permission can now be granted to sub-admins.
  const canAccess = can('canAccessCommunityPage', null);

  useEffect(() => {
    // Only check for permissions once loading is complete.
    if (!loading && !canAccess) {
      notFound();
    }
  }, [canAccess, loading]);

  // While loading or if access is not determined yet, render nothing.
  // This prevents a flash of content or a premature redirect.
  if (loading || !canAccess) {
    return null;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
        <div className="flex-1 overflow-y-auto no-scrollbar">
            {children}
        </div>
    </motion.div>
  );
}
