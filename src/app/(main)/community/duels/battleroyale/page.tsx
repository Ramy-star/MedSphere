
'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Loader2, PlusCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { UserProfile } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { motion } from 'framer-motion';

// Mock data for now, this would come from Firestore
const ongoingGames = [
    { id: 'game1', name: "Epic Anatomy Showdown", participantCount: 12, maxParticipants: 20, status: 'Waiting' },
    { id: 'game2', name: "Pharma Power Play", participantCount: 8, maxParticipants: 20, status: 'Waiting' },
    { id: 'game3', name: "Cardiology Clash", participantCount: 19, maxParticipants: 20, status: 'In Progress' },
];

const GameCard = ({ game }: { game: typeof ongoingGames[0] }) => (
    <motion.div 
        className="glass-card p-4 rounded-xl flex items-center justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div>
            <p className="font-bold text-white">{game.name}</p>
            <div className="flex items-center text-xs text-slate-400 gap-2 mt-1">
                <Users className="w-3.5 h-3.5" />
                <span>{game.participantCount} / {game.maxParticipants} players</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span className={game.status === 'Waiting' ? 'text-green-400' : 'text-yellow-400'}>
                    {game.status}
                </span>
            </div>
        </div>
        <Button size="sm" className="rounded-full bg-green-600 hover:bg-green-700" disabled={game.status !== 'Waiting'}>
            <LogIn className="mr-2 h-4 w-4" />
            Join
        </Button>
    </motion.div>
)

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

        <div className="flex-1 flex flex-col gap-8">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Join a Game</h2>
                    <Button className="rounded-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Game
                    </Button>
                </div>
                <div className="space-y-3">
                    {ongoingGames.map(game => (
                        <GameCard key={game.id} game={game} />
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
