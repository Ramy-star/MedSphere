'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NavHistory() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.back()}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        aria-label="Back"
      ><ArrowLeft size={16} /></button>

      <button
        onClick={() => window.history.forward()}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        aria-label="Forward"
      ><ArrowRight size={16} /></button>
    </div>
  );
}
