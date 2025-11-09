'use client';
import { motion } from 'framer-motion';

export default function DmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col overflow-hidden h-full"
    >
      {children}
    </motion.main>
  );
}
