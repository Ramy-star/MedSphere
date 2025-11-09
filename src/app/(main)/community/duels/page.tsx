
'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Swords, User, Users, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const GameModeCard = ({ title, description, icon: Icon, link, disabled = false }: { title: string, description: string, icon: React.ElementType, link: string, disabled?: boolean }) => {
    
    const content = (
        <div className={cn(
            "glass-card p-6 rounded-2xl h-full flex flex-col justify-between transition-all duration-300",
            disabled 
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-white/10 hover:shadow-lg hover:-translate-y-1 group"
        )}>
            <div>
                <div className="mb-4 inline-block p-3 rounded-full bg-slate-800">
                    <Icon className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                <p className="text-sm text-slate-400">{description}</p>
            </div>
             {disabled && <p className="text-center text-xs font-bold text-yellow-400 mt-4">COMING SOON</p>}
        </div>
    );
    
    if (disabled) {
        return <div className="block cursor-not-allowed">{content}</div>
    }

    return (
        <Link href={link} className="block">
            {content}
        </Link>
    );
}


export default function DuelsModeSelectionPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-10">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.push('/community')}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-red-500 to-rose-500 text-transparent bg-clip-text">
                Quiz Duels
            </h1>
        </div>

        <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: 0.1,
                    },
                },
            }}
        >
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <GameModeCard 
                    title="One-on-One Duel"
                    description="Challenge another student to a head-to-head quiz battle. Quickest correct answer wins the point!"
                    icon={Swords}
                    link="/community/duels/lobby"
                />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <GameModeCard 
                    title="Battle Royale"
                    description="A free-for-all quiz where many compete but only one emerges victorious. Last student standing wins."
                    icon={Users}
                    link="/community/duels/battleroyale"
                />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <GameModeCard 
                    title="Team vs. Team"
                    description="Form a squad and face off against another team. The highest-scoring team wins bragging rights."
                    icon={Shield}
                    link="/community/duels/teams"
                />
            </motion.div>
        </motion.div>
    </div>
  );
}
