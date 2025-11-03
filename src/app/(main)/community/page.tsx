
'use client';

import { Users, BarChart2, MessageSquare, BookOpen } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: React.ElementType, color: string }) => (
    <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
        <div className={`p-3 rounded-full bg-gradient-to-br ${color}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

export default function CommunityPage() {
    return (
        <div className="p-4 sm:p-6">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                    Community Hub
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
                    An overview of community activity and engagement. This section is currently under development.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Active Members" value="1,204" icon={Users} color="from-blue-500 to-cyan-500" />
                <StatCard title="Shared Resources" value="8,452" icon={BookOpen} color="from-green-500 to-teal-500" />
                <StatCard title="Forum Posts" value="2,910" icon={MessageSquare} color="from-orange-500 to-amber-500" />
                <StatCard title="Weekly Activity" value="+15%" icon={BarChart2} color="from-red-500 to-pink-500" />
            </div>

            <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl flex items-center justify-center h-64">
                <p className="text-slate-500 text-lg font-medium">More community features coming soon...</p>
            </div>
        </div>
    );
}
