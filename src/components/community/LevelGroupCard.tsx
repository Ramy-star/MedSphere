'use client';
import React, { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { findOrCreateLevelChannel } from '@/lib/communityService';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const LevelGroupCard = () => {
    const { user, isSuperAdmin } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleLevelGroupClick = async () => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Not Authenticated',
                description: "You must be logged in to access level groups.",
            });
            return;
        }

        // If the user is a super admin, navigate them to the overview page
        if (isSuperAdmin) {
            router.push('/community/channels/level');
            return;
        }

        // For regular users, find/create their specific level group and navigate
        if (!user.level) {
            toast({
                variant: 'destructive',
                title: 'Level Not Found',
                description: "Your academic level is not set. Please contact an admin.",
            });
            return;
        }

        setIsLoading(true);
        try {
            const channelId = await findOrCreateLevelChannel(user.level);
            router.push(`/community/chat/${channelId}`);
        } catch (error) {
            console.error("Failed to find or create level channel:", error);
            toast({
                variant: 'destructive',
                title: 'Error Accessing Group',
                description: "Could not access the group for your level. Please try again.",
            });
            setIsLoading(false); // Only set loading to false on error
        }
    };

    return (
        <div onClick={handleLevelGroupClick} className="block group cursor-pointer">
            <div className="glass-card p-6 rounded-2xl h-full flex flex-col justify-between transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:-translate-y-1">
                <div>
                    <div className="mb-4 inline-block p-3 rounded-full bg-gradient-to-br from-green-500 to-teal-500">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Level Groups</h2>
                    <p className="text-sm text-slate-400">Dedicated channels for each academic level to discuss coursework, exams, and level-specific topics.</p>
                </div>
                <div className="mt-6 flex items-center justify-end text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span>Entering...</span>
                        </>
                    ) : (
                        <>
                            <span>{isSuperAdmin ? 'View All' : 'Enter Chat'}</span>
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
