
'use client';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';
import { usePathname, notFound } from 'next/navigation';

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { can } = useAuthStore();
  const pathname = usePathname();
  // We reuse the admin panel permission for now, but could use 'canAccessCommunityPage' in the future.
  const canAccess = can('canAccessCommunityPage', pathname);

  useEffect(() => {
    // If user doesn't have access, redirect to home page.
    if (canAccess === false) { // Check for explicit false, as it might be null initially
      notFound();
    }
  }, [canAccess]);

  if (canAccess === null || !canAccess) {
    // Render nothing or a loading spinner while checking auth
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
