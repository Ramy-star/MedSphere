'use client';

import { Users, BarChart2, MessageSquare, BookOpen, Globe, Shield, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const SectionCard = ({
  title,
  description,
  icon: Icon,
  color,
  link,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  link: string;
}) => (
    <Link href={link} className="block group">
        <div className="glass-card p-6 rounded-2xl h-full flex flex-col justify-between transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:-translate-y-1">
            <div>
                <div className={`mb-4 inline-block p-3 rounded-full bg-gradient-to-br ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                <p className="text-sm text-slate-400">{description}</p>
            </div>
            <div className="mt-6 flex items-center justify-end text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                View Channels <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </div>
        </div>
    </Link>
);


export default function CommunityPage() {
    return (
        <div className="p-4 sm:p-6">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                    Community Hub
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
                    Connect, collaborate, and compete with your colleagues.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <SectionCard 
                    title="Public Channels"
                    description="Open forums for general discussions, announcements, and sharing resources available to everyone."
                    icon={Globe}
                    color="from-blue-500 to-cyan-500"
                    link="/community/channels/public"
                />
                <SectionCard 
                    title="Level Groups"
                    description="Dedicated channels for each academic level to discuss coursework, exams, and level-specific topics."
                    icon={Users}
                    color="from-green-500 to-teal-500"
                    link="/community/channels/level"
                />
                 <SectionCard 
                    title="Private Groups"
                    description="Invite-only groups for focused study sessions, project collaboration, or special interest topics."
                    icon={Lock}
                    color="from-orange-500 to-amber-500"
                    link="/community/channels/private"
                />
            </div>
        </div>
    );
}
