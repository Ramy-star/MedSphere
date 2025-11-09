
'use client';
import { motion } from 'framer-motion';

export default function BattleRoyaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
        <div className="flex-1 overflow-y-auto no-scrollbar">
            {children}
        </div>
    </motion.main>
  );
}
