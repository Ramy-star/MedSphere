'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Swords, User, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { UserProfile } from '@/stores/auth-store';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const PlayerCard = ({ player }: { player: UserProfile }) => {
    const isSuperAdmin = player.roles?.some(r => r.role === 'superAdmin');
    const isSubAdmin = player.roles?.some(r => r.role === 'subAdmin') && !isSuperAdmin;
    const avatarRingClass = isSuperAdmin ? "ring-yellow-400" : isSubAdmin ? "ring-blue-400" : "ring-transparent";
    
    return (
        <div className="glass-card p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Avatar className={cn("h-10 w-10 ring-2", avatarRingClass)}>
                    <AvatarImage src={player.photoURL || ''} alt={player.displayName} />
                    <AvatarFallback>{player.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold text-white">{player.displayName}</p>
                    <p className="text-xs text-slate-400">@{player.username}</p>
                </div>
            </div>
            <Button size="sm" className="rounded-full bg-red-600 hover:bg-red-700">
                <Swords className="mr-2 h-4 w-4"/>
                Challenge
            </Button>
        </div>
    )
}

export default function DuelsLobbyPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { data: users, loading } = useCollection<UserProfile>('users');

  const availablePlayers = useMemo(() => {
    if (!users || !currentUser) return [];
    // For now, list all users except the current one.
    // Later, this could be filtered by online status.
    return users.filter(user => user.id !== currentUser.id);
  }, [users, currentUser]);

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.push('/community/duels')}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-rose-500 text-transparent bg-clip-text">
                1-on-1 Duel Lobby
            </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Challenge a Player</h2>
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                    </div>
                ) : availablePlayers.length > 0 ? (
                    <div className="space-y-3">
                        {availablePlayers.map(player => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-500 glass-card rounded-xl">
                        <User className="w-12 h-12 mx-auto mb-2" />
                        <p>No other players available right now.</p>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                 <h2 className="text-lg font-bold text-white">Your Challenges</h2>
                  <div className="text-center py-10 text-slate-500 glass-card rounded-xl">
                    <p>Incoming challenges will appear here.</p>
                </div>
            </div>
        </div>
    </div>
  );
}
