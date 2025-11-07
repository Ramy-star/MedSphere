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
  
  // This is the key change: Check if the user has ANY admin role.
  const hasAdminRole = user?.roles && user.roles.length > 0;

  useEffect(() => {
    // Wait for auth state to be resolved before checking
    if (!loading && !hasAdminRole) { 
      notFound();
    }
  }, [hasAdminRole, loading]);

  // While loading, render nothing to avoid flashes of content.
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
