
'use client';
import { motion } from 'framer-motion';
import { use, Suspense } from 'react';

// This is a server component that can use `use`
function LayoutWrapper({ children }: { children: React.ReactNode }) {
    // This demonstrates using `use` if needed for async data in layouts
    // but for now, we just wrap it to ensure it's a Server Component
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col overflow-hidden h-full"
        >
            <Suspense fallback={<div>Loading...</div>}>
                {children}
            </Suspense>
        </motion.div>
    );
}

export default function ChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutWrapper>{children}</LayoutWrapper>;
}
