'use client';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { AddContentMenu } from '@/components/AddContentMenu';
import { motion } from 'framer-motion';

export default function FolderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.main
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden"
    >
      <FileExplorerHeader onFileSelected={() => {}} />
      {children}
    </motion.main>
  );
}
