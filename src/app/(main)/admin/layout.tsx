'use client';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSuperAdmin } = useAuthStore();

  useEffect(() => {
    // If not an admin, redirect to home page.
    // This is a simple client-side protection.
    if (isSuperAdmin === false) {
      window.location.href = '/';
    }
  }, [isSuperAdmin]);

  if (isSuperAdmin === null || !isSuperAdmin) {
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
