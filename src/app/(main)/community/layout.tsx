'use client';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';
import { notFound } from 'next/navigation';

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthStore();
  
  // This check is now more robust. It waits for loading to be false AND
  // for the user object to be fully populated, including the roles array.
  const hasAdminRole = !loading && user && Array.isArray(user.roles) && user.roles.length > 0;

  useEffect(() => {
    // We only trigger notFound if loading is complete AND the user definitively has no admin role.
    if (!loading && !hasAdminRole) {
      notFound();
    }
  }, [hasAdminRole, loading]);

  // While loading or if the role hasn't been determined yet, render nothing.
  // This prevents a flash of content or a premature redirect.
  if (loading || !hasAdminRole) {
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
