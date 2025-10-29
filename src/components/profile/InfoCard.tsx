
'use client';
import { cn } from '@/lib/utils';

export const InfoCard = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="glass-card flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl">
        <div className="p-1.5 sm:p-2 bg-slate-700/50 rounded-lg sm:rounded-xl">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
        </div>
        <div className="flex-1">
            <span className="text-xs sm:text-sm text-slate-400">{label}</span>
            <p className="text-sm sm:text-base font-medium text-white mt-0.5 font-mono break-all">{value}</p>
        </div>
    </div>
);
