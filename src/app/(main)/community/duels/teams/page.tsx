
'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Loader2, PlusCircle, Users, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';

const mockTeams = [
    { 
        id: 'team1', 
        name: 'The Scalpels', 
        members: [
            { name: 'Dr. Strange', avatar: 'https://i.pravatar.cc/150?u=a' },
            { name: 'Nurse Joy', avatar: 'https://i.pravatar.cc/150?u=b' },
            { name: 'Medic', avatar: 'https://i.pravatar.cc/150?u=c' },
        ],
    },
    { 
        id: 'team2', 
        name: 'Brainiacs', 
        members: [
            { name: 'Professor X', avatar: 'https://i.pravatar.cc/150?u=d' },
            { name: 'Jean Grey', avatar: 'https://i.pravatar.cc/150?u=e' },
        ],
    },
    {
        id: 'team3',
        name: 'Cardio Crew',
        members: [
            { name: 'Dr. Heart', avatar: 'https://i.pravatar.cc/150?u=f' },
        ]
    }
];

const TeamCard = ({ team }: { team: typeof mockTeams[0] }) => (
    <motion.div 
        className="glass-card p-4 rounded-xl flex flex-col"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className="flex-1">
            <h3 className="font-bold text-white text-lg">{team.name}</h3>
            <div className="flex -space-x-2 overflow-hidden mt-3">
                {team.members.map(member => (
                    <Avatar key={member.name} className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                    </Avatar>
                ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">{team.members.length} members</p>
        </div>
        <Button size="sm" className="rounded-full w-full mt-4 bg-blue-600 hover:bg-blue-700">
            <UserPlus className="mr-2 h-4 w-4"/>
            Join Team
        </Button>
    </motion.div>
);


export default function TeamQuizLobbyPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.push('/community/duels')}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-rose-500 text-transparent bg-clip-text">
                Team vs. Team
            </h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Join a Team</h2>
                     <Button className="rounded-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Team
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mockTeams.map(team => (
                        <TeamCard key={team.id} team={team} />
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Team Challenges</h2>
                <div className="text-center py-10 text-slate-500 glass-card rounded-xl">
                    <p>Incoming team challenges will appear here.</p>
                </div>
            </div>
        </div>
    </div>
  );
}
