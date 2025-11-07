'use client';
import { useEffect, useState, use } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { UserProfile, useAuthStore } from '@/stores/auth-store';
import { notFound, useRouter } from 'next/navigation';
import { Loader2, MessageSquare, School } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Crown, Shield } from 'lucide-react';
import { InfoCard } from '@/components/profile/InfoCard';
import { AchievementsSection } from '@/components/profile/Achievements';
import { FavoritesSection } from '@/components/profile/FavoritesSection';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { createOrGetDirectChat } from '@/lib/communityService';
import type { Content } from '@/lib/contentService';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const studentIdToLevelMap = new Map<string, string>();
// Populate with actual data if needed, for now it's a placeholder
// level1Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 1'));

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const { username } = use(params);
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { data: users, loading } = useCollection<UserProfile>('users', {
    where: ['username', '==', username],
    limit: 1,
  });
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [previewFile, setPreviewFile] = useState<Content | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    if (!loading && users && users.length > 0) {
      setUser(users[0]);
    } else if (!loading && (!users || users.length === 0)) {
      notFound();
    }
  }, [loading, users]);

  const handleFileClick = (item: Content) => {
    if (item.type === 'LINK') {
      if (item.metadata?.url) window.open(item.metadata.url, '_blank');
      return;
    }
    setPreviewFile(item);
  };

  const handleStartChat = async () => {
      if (!currentUser || !user) return;
      setIsCreatingChat(true);
      try {
          const chatId = await createOrGetDirectChat(currentUser.uid, user.uid);
          router.push(`/community/dm/${chatId}`);
      } catch (error) {
          console.error("Failed to start chat:", error);
      } finally {
          setIsCreatingChat(false);
      }
  };
  
  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  const isOwnProfile = currentUser?.uid === user.uid;
  const isSuperAdmin = user.roles?.some(r => r.role === 'superAdmin');
  const isSubAdmin = user.roles?.some(r => r.role === 'subAdmin') && !isSuperAdmin;

  const roleText = isSuperAdmin ? 'Super Admin' : isSubAdmin ? 'Admin' : 'Student';
  const roleColor = isSuperAdmin ? 'text-yellow-400' : isSubAdmin ? 'text-blue-400' : 'text-slate-300';
  const RoleIcon = isSuperAdmin ? Crown : isSubAdmin ? Shield : UserIcon;
  const avatarRingClass = isSuperAdmin ? "ring-yellow-400" : isSubAdmin ? "ring-blue-400" : "ring-transparent";
  const userLevel = user.level || studentIdToLevelMap.get(user.studentId);

  return (
    <>
      <div className="w-full pb-12">
        <div className="relative sm:h-64 h-36">
           {user.metadata?.coverPhotoURL && (
              <Image
                  src={user.metadata.coverPhotoURL}
                  alt="Cover photo"
                  fill
                  style={{objectFit: 'cover'}}
                  className="pointer-events-none select-none"
                  priority
              />
           )}
           <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center -mt-12 sm:-mt-16 px-4 sm:px-8 sm:flex-row sm:items-end sm:gap-4">
          <Avatar className={cn("h-20 w-20 sm:h-28 sm:w-28 ring-4", avatarRingClass)}>
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
            <AvatarFallback className="text-3xl sm:text-4xl">
              {user.displayName?.[0] || <UserIcon />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left sm:pb-4 w-full flex flex-col sm:flex-row items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">{user.displayName}</h1>
              <p className={cn("mt-1 text-sm sm:text-lg font-medium flex items-center justify-center sm:justify-start gap-2", roleColor)}>
                <RoleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {roleText}
              </p>
            </div>
             {!isOwnProfile && (
                <Button onClick={handleStartChat} disabled={isCreatingChat} className="mt-4 sm:mt-0 rounded-full">
                    {isCreatingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    Message
                </Button>
            )}
          </div>
        </div>

        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-8">
            <div className="lg:col-span-1 space-y-4">
                <InfoCard icon={RoleIcon} label="Username" value={`@${user.username}`} />
                {userLevel && <InfoCard icon={School} label="Academic Level" value={userLevel} />}
            </div>
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <h2 className="text-xl font-bold mb-4">Favorites</h2>
                    <FavoritesSection user={user} onFileClick={handleFileClick} />
                </div>
                 <div>
                    <h2 className="text-xl font-bold mb-4">Achievements</h2>
                    <AchievementsSection user={user} />
                </div>
            </div>
        </div>
      </div>
       <FilePreviewModal
        item={previewFile}
        onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
      />
    </>
  );
}
