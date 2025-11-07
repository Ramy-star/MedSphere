'use client';
import { use } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Swords } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DuelPage({ params }: { params: { duelId: string } }) {
  const { duelId } = use(params);
  const router = useRouter();

  // This is a placeholder page. The actual duel logic will be implemented here.

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full items-center justify-center">
        <Swords className="w-24 h-24 text-red-500 mb-8 animate-pulse" />
        <h1 className="text-3xl font-bold text-white">Duel in Progress</h1>
        <p className="text-slate-400 mt-2">Duel ID: {duelId}</p>
        <p className="mt-4">The real-time quiz interface will be built here.</p>
        <Button onClick={() => router.back()} className="mt-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lobby
        </Button>
    </div>
  );
}
