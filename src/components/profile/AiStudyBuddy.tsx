'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, Book, FileQuestion, Star, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStudyBuddyInsight } from '@/ai/flows/study-buddy-flow';
import type { UserProfile } from '@/stores/auth-store';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type Suggestion = {
    label: string;
    action: "CREATE_QUIZ" | "TAKE_EXAM" | "REVIEW_FILES" | "EXPLORE_SUBJECTS" | "VIEW_FAVORITES" | "ASK_AI";
};

type Insight = {
    greeting: string;
    mainInsight: string;
    suggestedActions: Suggestion[];
};

const actionIcons: Record<Suggestion['action'], React.ElementType> = {
    CREATE_QUIZ: FileQuestion,
    TAKE_EXAM: Book,
    REVIEW_FILES: Book,
    EXPLORE_SUBJECTS: Lightbulb,
    VIEW_FAVORITES: Star,
    ASK_AI: Send,
};


export function AiStudyBuddy({ user }: { user: UserProfile }) {
    const [insight, setInsight] = useState<Insight | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchInsight = async () => {
            setLoading(true);
            const userStats = {
                displayName: user.displayName,
                username: user.username,
                filesUploaded: user.stats?.filesUploaded || 0,
                foldersCreated: user.stats?.foldersCreated || 0,
                examsCompleted: user.stats?.examsCompleted || 0,
                aiQueries: user.stats?.aiQueries || 0,
                favoritesCount: user.favorites?.length || 0,
            };
            const result = await getStudyBuddyInsight(userStats);
            setInsight(result);
            setLoading(false);
        };

        fetchInsight();
    }, [user]);

    const handleSuggestionClick = (action: Suggestion['action']) => {
        switch (action) {
            case 'TAKE_EXAM':
                router.push('/exam');
                break;
            case 'CREATE_QUIZ':
                router.push('/questions-creator');
                break;
            case 'EXPLORE_SUBJECTS':
                router.push('/');
                break;
            case 'VIEW_FAVORITES':
                // For now, just stays on the profile page. Could scroll to favorites later.
                break;
            default:
                toast({
                    title: "Coming Soon!",
                    description: "This feature is currently under development.",
                });
                break;
        }
    };


    if (loading) {
        return (
            <div className="glass-card flex items-center gap-4 p-6 rounded-2xl mb-12 min-h-[160px]">
                <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                </div>
                <div className="space-y-2 flex-1">
                    <div className="h-5 w-1/3 bg-slate-700/80 rounded-md animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-slate-800 rounded-md animate-pulse"></div>
                    <div className="h-4 w-1/2 bg-slate-800 rounded-md animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!insight) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card flex flex-col sm:flex-row items-start gap-6 p-6 rounded-2xl mb-12"
        >
            <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-blue-500/50 shadow-lg">
                    <AiAssistantIcon className="w-9 h-9" />
                </div>
            </div>

            <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{insight.greeting}</h3>
                <p className="text-slate-300 mt-2 max-w-prose">{insight.mainInsight}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                    {insight.suggestedActions.map((suggestion, index) => {
                        const Icon = actionIcons[suggestion.action];
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 + index * 0.1 } }}
                            >
                                <Button
                                    onClick={() => handleSuggestionClick(suggestion.action)}
                                    variant="outline"
                                    className="rounded-full bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 text-slate-200"
                                >
                                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                                    {suggestion.label}
                                </Button>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
```