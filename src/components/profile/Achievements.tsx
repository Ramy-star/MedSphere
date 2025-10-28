
'use client';
import React from 'react';
import type { UserProfile } from '@/stores/auth-store';
import { allAchievements, Achievement } from '@/lib/achievements';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const tierColors = {
  bronze: {
    bg: 'bg-orange-800/30',
    border: 'border-orange-600/50',
    icon: 'text-orange-400',
    progress: 'bg-orange-500',
  },
  silver: {
    bg: 'bg-slate-600/30',
    border: 'border-slate-400/50',
    icon: 'text-slate-300',
    progress: 'bg-slate-400',
  },
  gold: {
    bg: 'bg-yellow-700/30',
    border: 'border-yellow-500/50',
    icon: 'text-yellow-400',
    progress: 'bg-yellow-500',
  },
  special: {
    bg: 'bg-purple-800/30',
    border: 'border-purple-500/50',
    icon: 'text-purple-400',
    progress: 'bg-purple-500',
  },
};

const BadgeCard = ({ achievement, userStats, earned }: { achievement: Achievement, userStats: any, earned: boolean }) => {
  const { icon: Icon, name, description, tier, condition } = achievement;
  const colors = tierColors[tier];
  
  const currentProgress = userStats[condition.stat] || 0;
  const goal = condition.value;
  const progressPercent = goal > 0 ? Math.min((currentProgress / goal) * 100, 100) : (earned ? 100 : 0);

  const cardContent = (
    <motion.div
      className={cn(
        "relative flex h-full flex-col justify-between rounded-2xl border p-4 text-center transition-all duration-300",
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
          <Progress value={progressPercent} className={cn("h-1", colors.progress)} />
          <p className="mt-1 text-xs text-slate-500">{currentProgress} / {goal}</p>
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
  const userStats = user.stats || {};
  const earnedAchievements = new Set(user.achievements?.map(a => a.badgeId) || []);

  const categorizedAchievements = allAchievements.reduce((acc, ach) => {
    if (!acc[ach.category]) {
      acc[ach.category] = [];
    }
    acc[ach.category].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-white mb-6">Achievements</h2>
      {Object.entries(categorizedAchievements).map(([category, achievements]) => (
        <div key={category} className="mb-8">
          <h3 className="text-lg font-semibold text-slate-300 mb-4">{category}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {achievements.map((ach) => (
              <BadgeCard
                key={ach.id}
                achievement={ach}
                userStats={userStats}
                earned={earnedAchievements.has(ach.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
