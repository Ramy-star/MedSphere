'use client';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { motion } from 'framer-motion';

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.main
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex-1 p-6 flex flex-col overflow-hidden"
    >
      <Breadcrumbs />
      {children}
    </motion.main>
  );
}
