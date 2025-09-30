
'use client';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { WifiOff, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <div className="glass-card p-8 md:p-12 rounded-3xl max-w-md w-full flex flex-col items-center">
            <WifiOff className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-2">
                You are Offline
            </h1>
            <p className="text-slate-300 mb-8">
                Your connection to the internet is lost. You can still browse content that you have previously viewed.
            </p>
            <Link href="/" passHref>
                <Button size="lg" className="rounded-full">
                    <Home className="mr-2 h-5 w-5" />
                    Back to Home
                </Button>
            </Link>
        </div>
    </div>
  );
}
