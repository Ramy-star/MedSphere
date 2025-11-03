
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
    progressFill: 'bg-gradient-to-r from-orange-600 to-orange-400',
  },
  silver: {
    bg: 'bg-slate-800/40',
    border: 'border-slate-600/60',
    icon: 'text-slate-200',
    progressFill: 'bg-gradient-to-r from-slate-500 to-slate-300',
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


const BadgeCard = ({ achievement, userStats, earned }: { achievement: Achievement, userStats: any, earned: boolean }) => {
  const { id, icon: Icon, name, description, tier, condition } = achievement;
  
  const colors = tier === 'silver' && name === 'A Good Start' 
    ? tierColors.silver 
    : tierColors[tier];
  
  const currentProgress = userStats[condition.stat] || 0;
  const goal = condition.value;
  const progressPercent = goal > 0 ? Math.min((currentProgress / goal) * 100, 100) : (earned ? 100 : 0);

  const cardContent = (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-2xl border p-3 sm:p-4 text-center transition-all duration-300 w-full h-full",
        earned ? `${colors.bg} ${colors.border}` : "border-slate-800 bg-slate-900/50",
        !earned && "group-hover:border-slate-700 group-hover:bg-slate-800/40"
      )}
    >
      <div className="flex flex-col items-center">
        <div className={cn(
          "mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full", 
          earned ? (id === 'FIRST_LOGIN' ? 'bg-gradient-to-br from-slate-400 to-slate-600' : colors.bg) : 'bg-slate-800'
        )}>
          {earned ? (
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", (id === 'FIRST_LOGIN' ? 'text-white' : colors.icon))} />
          ) : (
            <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500" />
          )}
        </div>
        <p className={cn("text-xs sm:text-sm font-semibold", earned ? "text-white" : "text-slate-400")}>{name}</p>
        <p className="mt-1 text-[10px] sm:text-xs text-slate-500 line-clamp-3">{description}</p>
      </div>

      {!earned && goal > 0 && (
        <div className="mt-2 sm:mt-3">
           <Progress value={progressPercent} className="h-1 bg-black/30" indicatorClassName={colors.progressFill} />
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-[140px] h-[180px] sm:w-[150px] sm:h-[190px] flex-shrink-0">
            {cardContent}
          </div>
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
    <div className="space-y-3 sm:space-y-4">
      {Object.entries(categorizedAndGroupedAchievements).map(([category, groups], categoryIndex) => {
        const isSpecialCategory = category === 'Special';
        
        let achievementsToRender: Achievement[] = [];
        if(isSpecialCategory) {
            // For special category, only show achievements that have been earned.
            achievementsToRender = Object.values(groups).flat().filter(ach => earnedAchievements.has(ach.id));
             // If the user is a super admin, show all special achievements
            if (isSuperAdmin) {
              achievementsToRender = Object.values(groups).flat();
            }
        } else {
            achievementsToRender = Object.values(groups).flat();
        }

        // If it's the special category and there are no earned achievements to show (and user is not admin), skip rendering the category.
        if (isSpecialCategory && achievementsToRender.length === 0) {
            return null;
        }
        
        return (
            <React.Fragment key={category}>
                <h3 className="text-sm sm:text-md font-bold text-slate-300 px-2 mt-2">{category}</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-row gap-3 sm:gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {achievementsToRender.map((ach) => (
                      <BadgeCard
                          key={ach.id}
                          achievement={ach}
                          userStats={userStats}
                          earned={isSuperAdmin || earnedAchievements.has(ach.id)}
                      />
                  ))}
                  </div>
                </div>
                {categoryIndex < Object.keys(categorizedAndGroupedAchievements).length - 1 && (
                    <div className="w-full h-px bg-slate-800 my-3 sm:my-4" />
                )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
