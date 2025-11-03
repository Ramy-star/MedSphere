'use client';

import { Logo } from './logo';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 overflow-hidden"
    >
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-green-500/20 rounded-full blur-3xl opacity-50"></div>

      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center glass-card p-8 md:p-12 rounded-[1.75rem] max-w-2xl w-full"
      >
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
        >
            <Logo className="h-20 w-20 md:h-24 md:w-24 mb-6" />
        </motion.div>

        <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 text-transparent bg-clip-text"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
        >
          Welcome to <span className="font-extrabold">Med</span><span className="text-[#00D309] font-normal">Sphere</span>
        </motion.h1>

        <motion.p 
            className="text-slate-300 text-base md:text-lg max-w-md mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
        >
          Your all-in-one digital companion to organize, access, and master your medical study materials effortlessly.
        </motion.p>
        
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.1 }}
        >
            <Button 
              size="lg" 
              onClick={onGetStarted} 
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6 transition-transform active:scale-95"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </motion.div>
      </motion.div>

      <footer className="absolute bottom-4 text-center text-xs text-slate-500 z-10">
        © 2025 MedSphere. All rights reserved.
      </footer>
    </motion.div>
  );
}
