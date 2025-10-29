
'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Edit, Loader2, Save, User as UserIcon, X, Trash2, Crown, Shield, Mail, Badge, School, Image as ImageIcon, LogOut, Star, Activity, Info, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { contentService, type Content } from '@/lib/contentService';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import level1Ids from '@/lib/student-ids/level-1.json';
import level2Ids from '@/lib/student-ids/level-2.json';
import level3Ids from '@/lib/student-ids/level-3.json';
import level4Ids from '@/lib/student-ids/level-4.json';
import level5Ids from '@/lib/student-ids/level-5.json';
import { InfoCard } from '@/components/profile/InfoCard';
import { AchievementsSection } from '@/components/profile/Achievements';
import Image from 'next/image';
import { FavoritesSection } from '@/components/profile/FavoritesSection';
import { ActiveSessions } from '@/components/profile/ActiveSessions';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { AiStudyBuddy } from '@/components/profile/AiStudyBuddy';
import * as Collapsible from '@radix-ui/react-collapsible';

const studentIdToLevelMap = new Map<string, string>();
level1Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 1'));
level2Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 2'));
level3Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 3'));
level4Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 4'));
level5Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 5'));

const sectionVariants = {
    open: {
        clipPath: `inset(0% 0% 0% 0%)`,
        opacity: 1,
        height: 'auto',
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    },
    collapsed: {
        clipPath: `inset(0% 0% 100% 0%)`,
        opacity: 0,
        height: 0,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
    }
};

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }: { title: string, icon: React.ElementType, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
             <Collapsible.Trigger className="w-full">
                <div className="flex w-full items-center justify-between py-2 mb-2 hover:bg-slate-800/50 rounded-lg px-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
                        <h2 className="text-lg sm:text-2xl font-bold text-white">{title}</h2>
                    </div>
                     <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </div>
            </Collapsible.Trigger>
            <AnimatePresence initial={false}>
              {isOpen && (
                <Collapsible.Content asChild forceMount>
                   <motion.div
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      variants={sectionVariants}
                      className="overflow-hidden"
                    >
                      {children}
                    </motion.div>
                </Collapsible.Content>
              )}
            </AnimatePresence>
        </Collapsible.Root>
    );
};


export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { toast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteCoverConfirm, setShowDeleteCoverConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [previewFile, setPreviewFile] = useState<Content | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      // Move cursor to the end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(nameInputRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editingName]);

  const handleSaveName = async () => {
    if (!user || !nameInputRef.current) return;
    
    const newDisplayName = nameInputRef.current.textContent?.trim() || '';
    
    if (newDisplayName === '' || newDisplayName === user.displayName) {
      setEditingName(false);
      if(nameInputRef.current) nameInputRef.current.textContent = user.displayName; // Revert if empty or unchanged
      return;
    }

    setIsSavingName(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { displayName: newDisplayName });
      toast({ title: 'Success', description: 'Your name has been updated.' });
      setEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your name.' });
      if(nameInputRef.current && user.displayName) nameInputRef.current.textContent = user.displayName; // Revert on error
    } finally {
      setIsSavingName(false);
    }
  };
  
  const handleCancelEdit = () => {
    if (nameInputRef.current && user) {
        nameInputRef.current.textContent = user.displayName || '';
    }
    setEditingName(false);
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.'});
        return;
    }

    setIsUploading(true);
    try {
        await contentService.uploadUserAvatar(user, file, (progress) => {});
        toast({ title: 'Success', description: 'Profile picture updated.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        console.error('Error uploading avatar:', error);
    } finally {
        setIsUploading(false);
    }
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.'});
        return;
    }

    setIsUploadingCover(true);
    try {
        await contentService.uploadUserCoverPhoto(user, file, (progress) => {});
        toast({ title: 'Success', description: 'Cover photo updated.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        console.error('Error uploading cover photo:', error);
    } finally {
        setIsUploadingCover(false);
    }
  };

  const handleDeletePicture = async () => {
      if (!user) return;
      setIsUploading(true);
      try {
          await contentService.deleteUserAvatar(user);
          toast({ title: 'Success', description: 'Profile picture removed.' });
      } catch(error: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not remove profile picture.' });
          console.error("Error deleting avatar:", error);
      } finally {
          setIsUploading(false);
          setShowDeleteConfirm(false);
      }
  }

  const handleDeleteCoverPicture = async () => {
      if (!user) return;
      setIsUploadingCover(true);
      try {
          await contentService.deleteUserCoverPhoto(user);
          toast({ title: 'Success', description: 'Cover photo removed.' });
      } catch(error: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not remove cover photo.' });
          console.error("Error deleting cover photo:", error);
      } finally {
          setIsUploadingCover(false);
          setShowDeleteCoverConfirm(false);
      }
  }

  const handleFileClick = (item: Content) => {
    if (item.type === 'LINK') {
      if (item.metadata?.url) window.open(item.metadata.url, '_blank');
      return;
    }
    setPreviewFile(item);
  };
  
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 w-8 animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = user.roles?.some(r => r.role === 'superAdmin');
  const isSubAdmin = user.roles?.some(r => r.role === 'subAdmin') && !isSuperAdmin;

  const roleText = isSuperAdmin ? 'Super Admin' : isSubAdmin ? 'Admin' : 'Student';
  const roleColor = isSuperAdmin ? 'text-yellow-400' : isSubAdmin ? 'text-blue-400' : 'text-slate-300';
  const RoleIcon = isSuperAdmin ? Crown : isSubAdmin ? Shield : UserIcon;
  const avatarRingClass = isSuperAdmin ? "ring-yellow-400" : isSubAdmin ? "ring-blue-400" : "ring-transparent";
  const userLevel = user.level || studentIdToLevelMap.get(user.studentId) || 'Not Specified';

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full pb-12 overflow-x-hidden"
    >
      <div className="relative group/cover h-32 sm:h-64">
         <input
            type="file"
            ref={coverFileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleCoverImageChange}
          />
         <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity z-20">
            <Button
                size="sm"
                className="h-8 rounded-full bg-slate-800/80 hover:bg-slate-700/90 border border-slate-600 text-white"
                onClick={() => coverFileInputRef.current?.click()}
                disabled={isUploadingCover}
            >
                {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4 mr-2" />}
                <span className="text-xs">Change Cover</span>
            </Button>
             {user.metadata?.coverPhotoURL && (
                  <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 rounded-full bg-red-800/80 hover:bg-red-700/90 border border-red-600"
                      onClick={() => setShowDeleteCoverConfirm(true)}
                      disabled={isUploadingCover}
                  >
                      <Trash2 className="w-4 h-4" />
                  </Button>
              )}
         </div>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end -mt-12 sm:-mt-16 px-4 sm:px-8 gap-4">
        <div className="relative group/avatar">
          <Avatar className={cn("h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-offset-2 ring-offset-slate-900 transition-all", avatarRingClass)}>
            <AvatarImage 
                src={user.photoURL} 
                alt={user.displayName}
                className="pointer-events-none select-none"
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
            />
            <AvatarFallback className="text-3xl sm:text-4xl">
              {user.displayName?.[0] || <UserIcon />}
            </AvatarFallback>
          </Avatar>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
          <div className="absolute bottom-1 right-1 flex gap-1">
              <Button
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-800/80 hover:bg-slate-700/90 border border-slate-600 opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4" />}
              </Button>
              {user.photoURL && (
                  <Button
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-800/80 hover:bg-red-700/90 border border-red-600 opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isUploading}
                  >
                      <Trash2 className="w-4 h-4" />
                  </Button>
              )}
          </div>
        </div>

        <div className="text-center sm:text-left sm:pb-4 w-full group">
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center gap-2">
                <h1
                  ref={nameInputRef}
                  contentEditable={editingName}
                  suppressContentEditableWarning={true}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveName();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      handleCancelEdit();
                    }
                  }}
                  className={cn(
                    "text-xl sm:text-3xl font-bold outline-none whitespace-nowrap",
                    editingName && "ring-2 ring-blue-500 rounded-md px-2 focus:bg-white/10"
                  )}
                >
                  {user.displayName}
                </h1>
                {!editingName && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full group-hover:opacity-100 md:opacity-0 transition-opacity flex-shrink-0" onClick={() => setEditingName(true)}>
                      <Edit className="w-5 h-5" />
                  </Button>
                )}
              </div>

            {editingName && (
                <div className="flex items-center gap-2 mt-2 w-full justify-center sm:justify-start">
                   <Button size="sm" onClick={handleSaveName} disabled={isSavingName} className="h-8 rounded-full flex-shrink-0">
                      {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                      Save
                  </Button>
                   <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 rounded-full flex-shrink-0">
                      <X className="w-4 h-4 mr-1.5" />
                      Cancel
                  </Button>
                </div>
            )}
            </div>

            <p className={cn("mt-1 text-sm sm:text-lg font-medium flex items-center justify-center sm:justify-start gap-2", roleColor)}>
              <RoleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              {roleText}
            </p>
        </div>
      </div>
      
      <div className="mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8 gap-y-8 items-start px-4 sm:px-0">
        <div className="flex flex-col space-y-6 sm:space-y-8">
            <AiStudyBuddy user={user} />
            <CollapsibleSection title="User Information" icon={Info} defaultOpen={true}>
                <div className="space-y-3 sm:space-y-4">
                    <InfoCard icon={Badge} label="Student ID" value={user.studentId} />
                    <InfoCard icon={Mail} label="Email" value={user.email || 'Not available'} />
                    <InfoCard icon={School} label="Academic Level" value={userLevel} />
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Active Sessions" icon={Activity} defaultOpen={true}>
                <ActiveSessions user={user} />
            </CollapsibleSection>
        </div>

        <div className="w-px bg-slate-700/80 h-full hidden lg:block" />

        <div className="space-y-6 sm:space-y-8 mt-4 sm:mt-8 lg:mt-0">
            <CollapsibleSection title="Favorites" icon={Star} defaultOpen={true}>
                <FavoritesSection user={user} onFileClick={handleFileClick} />
            </CollapsibleSection>
            <CollapsibleSection title="Achievements" icon={Crown} defaultOpen={true}>
               <AchievementsSection user={user} />
            </CollapsibleSection>
        </div>
      </div>
      
      <div className="mt-12 sm:mt-16 flex justify-center">
          <button onClick={() => setShowLogoutConfirm(true)} className="expanding-btn destructive">
              <LogOut size={20} />
              <span className="expanding-text">Logout</span>
          </button>
      </div>

    </motion.div>
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your profile picture and revert to the default avatar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePicture} className="bg-red-600 hover:bg-red-700">Remove Picture</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDeleteCoverConfirm} onOpenChange={setShowDeleteCoverConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your cover photo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCoverPicture} className="bg-red-600 hover:bg-red-700">Remove Cover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be returned to the verification screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="bg-red-600 hover:bg-red-700">Log Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <FilePreviewModal
        item={previewFile}
        onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
      />
    </>
  );
}
