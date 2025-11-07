
'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BattleRoyaleLobbyPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.push('/community/duels')}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-rose-500 text-transparent bg-clip-text">
                Battle Royale
            </h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center glass-card rounded-2xl">
            <Users className="w-16 h-16 text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-white">Feature Under Construction</h2>
            <p className="text-slate-400 mt-2 max-w-sm">The Battle Royale mode is being developed. Soon you'll be able to compete against everyone at once. Stay tuned!</p>
        </div>
    </div>
  );
}
