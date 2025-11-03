'use client';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { notFound } from 'next/navigation';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { can } = useAuthStore();
  const pathname = usePathname();
  // For now, only admins can access the studio
  const canAccess = can('canAccessAdminPanel', pathname);

  useEffect(() => {
    // If user doesn't have access, redirect or show 404.
    if (canAccess === false) { // Check for explicit false, as it might be null initially
      notFound();
    }
  }, [canAccess]);

  if (canAccess === null || !canAccess) {
    // Render nothing or a loading spinner while checking auth
    return null;
  }
  
  return (
    <motion.main
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {children}
    </motion.main>
  );
}
