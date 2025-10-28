
'use client';
import React from 'react';
import type { UserProfile } from '@/stores/auth-store';
import { useAuthStore } from '@/stores/auth-store';
import { allAchievements, Achievement } from '@/lib/achievements';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const tierColors = {
  bronze: {
    bg: 'bg-orange-950/60',
    border: 'border-orange-800/70',
    icon: 'text-orange-500',
    progressFill: 'bg-gradient-to-r from-orange-700 to-orange-500',
  },
  silver: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-700/60',
    icon: 'text-blue-400',
    progressFill: 'bg-gradient-to-r from-blue-600 to-blue-400',
  },
  gold: {
    bg: 'bg-yellow-900/40',
    border: 'border-yellow-600/50',
    icon: 'text-yellow-400',
    progressFill: 'bg-gradient-to-r from-yellow-600 to-yellow-400',
  },
  special: {
    bg: 'bg-purple-950/40',
    border: 'border-purple-700/60',
    icon: 'text-purple-400',
    progressFill: 'bg-gradient-to-r from-purple-600 to-purple-400',
  },
};

const silverOverride = {
    bg: 'bg-slate-800/50',
    border: 'border-slate-600/70',
    icon: 'text-slate-300',
    progressFill: 'bg-gradient-to-r from-slate-500 to-slate-300',
}


const BadgeCard = ({ achievement, userStats, earned }: { achievement: Achievement, userStats: any, earned: boolean }) => {
  const { id, icon: Icon, name, description, tier, condition } = achievement;
  
  // Specific override for "A Good Start" to be silver/gray
  const isGoodStart = id === 'FIRST_LOGIN';
  const colors = isGoodStart ? silverOverride : tierColors[tier];
  
  const currentProgress = userStats[condition.stat] || 0;
  const goal = condition.value;
  const progressPercent = goal > 0 ? Math.min((currentProgress / goal) * 100, 100) : (earned ? 100 : 0);

  const cardContent = (
    <motion.div
      className={cn(
        "relative flex h-full w-[150px] flex-col justify-between rounded-2xl border p-4 text-center transition-all duration-300",
        earned ? `${colors.bg} ${colors.border}` : "border-slate-800 bg-slate-900/50",
        !earned && "group-hover:border-slate-700 group-hover:bg-slate-800/40"
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center">
        <div className={cn("mb-3 flex h-12 w-12 items-center justify-center rounded-full", earned ? colors.bg : 'bg-slate-800')}>
          {earned ? (
            <Icon className={cn("h-6 w-6", colors.icon)} />
          ) : (
            <Lock className="h-6 w-6 text-slate-500" />
          )}
        </div>
        <p className={cn("text-sm font-semibold", earned ? "text-white" : "text-slate-400")}>{name}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      {!earned && goal > 0 && (
        <div className="mt-3">
           <Progress value={progressPercent} className="h-1 bg-black/30" indicatorClassName={colors.progressFill} />
        </div>
      )}
    </motion.div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent className="rounded-lg bg-black text-white">
          {earned ? (
            <p>Achieved!</p>
          ) : (
            <p>{goal > 0 ? `Progress: ${currentProgress}/${goal}` : 'Secret achievement'}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const AchievementsSection = ({ user }: { user: UserProfile }) => {
  const { isSuperAdmin } = useAuthStore();
  const userStats = user.stats || {};
  const earnedAchievements = new Set(user.achievements?.map(a => a.badgeId) || []);

  const categorizedAndGroupedAchievements = allAchievements.reduce((acc, ach) => {
    if (!acc[ach.category]) {
      acc[ach.category] = {};
    }
    if (!acc[ach.category][ach.group]) {
      acc[ach.category][ach.group] = [];
    }
    acc[ach.category][ach.group].push(ach);
    return acc;
  }, {} as Record<string, Record<string, Achievement[]>>);

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-white mb-6">Achievements</h2>
      {Object.entries(categorizedAndGroupedAchievements).map(([category, groups], categoryIndex) => {
        const isSpecialCategory = category === 'Special';
        const hasEarnedSpecial = isSuperAdmin || Object.values(groups).flat().some(ach => earnedAchievements.has(ach.id));
        
        if (isSpecialCategory && !hasEarnedSpecial) {
            return null;
        }
        
        const isConsistencyCategory = category === 'Consistency & Perseverance';

        return (
            <React.Fragment key={category}>
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">{category}</h3>
                    <div className="space-y-4">
                        {Object.entries(groups).map(([group, achievements], groupIndex) => (
                        <React.Fragment key={group}>
                            <div className="flex flex-row gap-4 overflow-x-auto pb-4 no-scrollbar">
                            {achievements.map((ach) => (
                                <BadgeCard
                                key={ach.id}
                                achievement={ach}
                                userStats={userStats}
                                earned={isSuperAdmin || earnedAchievements.has(ach.id)}
                                />
                            ))}
                            </div>
                            {!isConsistencyCategory && groupIndex < Object.keys(groups).length - 1 && (
                                <hr className="my-2 border-slate-800" />
                            )}
                        </React.Fragment>
                        ))}
                    </div>
                </div>
                {categoryIndex < Object.keys(categorizedAndGroupedAchievements).length - 1 && (
                    <hr className="my-8 border-t-2 border-slate-800" />
                )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
