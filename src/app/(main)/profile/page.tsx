
'use client';

import { useState, useRef, useEffect, ReactNode, Suspense, lazy } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Edit, Loader2, Save, User as UserIcon, X, Trash2, Crown, Shield, Mail, Badge, School, Image as ImageIcon, LogOut, Star, Activity, Info, ChevronDown, NotebookPen } from 'lucide-react';
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
import dynamic from 'next/dynamic';

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
import * as Collapsible from '@radix-ui/react-collapsible';
import { ProfileNotesSection } from '@/components/profile/ProfileNotesSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangeSecretCodeDialog } from '@/components/profile/ChangeSecretCodeDialog';

const FilePreviewModal = dynamic(() => import('@/components/FilePreviewModal').then(mod => mod.FilePreviewModal), {
    loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Skeleton className="w-3/4 h-3/4" /></div>,
    ssr: false
});


const studentIdToLevelMap = new Map<string, string>();
level1Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 1'));
level2Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 2'));
level3Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 3'));
level4Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 4'));
level5Ids.forEach(id => studentIdToLevelMap.set(String(id), 'Level 5'));

const sectionVariants = {
    open: {
        opacity: 1,
        height: 'auto',
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
            when: "beforeChildren",
            staggerChildren: 0.05,
        }
    },
    collapsed: {
        opacity: 0,
        height: 0,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 40,
            when: "afterChildren",
            staggerChildren: 0.05,
            staggerDirection: -1
        }
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
  const isMobile = useIsMobile();

  const [editingName, setEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteCoverConfirm, setShowDeleteCoverConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [previewFile, setPreviewFile] = useState<Content | null>(null);
  const [showChangeSecretCode, setShowChangeSecretCode] = useState(false);

  // New state for drag-and-drop and confirmation
  const [imageToConfirm, setImageToConfirm] = useState<{ file: File; type: 'avatar' | 'cover' } | null>(null);
  const [isAvatarDragging, setIsAvatarDragging] = useState(false);
  const [isCoverDragging, setIsCoverDragging] = useState(false);
  const confirmationImagePreview = imageToConfirm ? URL.createObjectURL(imageToConfirm.file) : null;


  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
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
      if(nameInputRef.current) nameInputRef.current.textContent = user.displayName || ''; // Revert if empty or unchanged
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

  const handleAvatarUpload = async (file: File) => {
      if (!user) return;
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.'});
        return;
    }
    setImageToConfirm({ file, type: 'avatar' });
  };

  const handleCoverUpload = async (file: File) => {
      if (!user) return;
      setIsUploadingCover(true);
      try {
          await contentService.uploadUserCoverPhoto(user, file, (progress) => {});
          toast({ title: 'Success', description: 'Cover photo updated.' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
          console.error("Error uploading cover photo:", error);
      } finally {
          setIsUploadingCover(false);
      }
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.'});
        return;
    }
    setImageToConfirm({ file, type: 'cover' });
  };

  const handleDragEvents = (setter: React.Dispatch<React.SetStateAction<boolean>>) => ({
      onDragEnter: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setter(true); },
      onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          // Check if the cursor is leaving to a child element
          if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
              return;
          }
          setter(false);
      },
      onDragOver: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); },
  });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'avatar' | 'cover') => {
      e.preventDefault();
      e.stopPropagation();
      setIsAvatarDragging(false);
      setIsCoverDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
          setImageToConfirm({ file, type });
      } else {
          toast({ variant: 'destructive', title: 'Invalid File', description: 'Please drop a single image file.' });
      }
  };
  
  const handleConfirmImageUpload = () => {
    if (!imageToConfirm) return;
    const { file, type } = imageToConfirm;

    if (type === 'avatar') {
        handleAvatarUpload(file);
    } else {
        handleCoverUpload(file);
    }
    setImageToConfirm(null); // Close dialog
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
  const userLevel = user.level || studentIdToLevelMap.get(user.studentId);

  const DesktopLayout = () => (
    <div className="mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8 gap-y-8 items-start w-full px-4 sm:px-8">
        <div className="flex flex-col space-y-6 sm:space-y-8 min-w-0">
             <CollapsibleSection title="User Information" icon={Info} defaultOpen={true}>
                <div className="space-y-3 sm:space-y-4">
                    <InfoCard icon={Badge} label="Student ID" value={user.studentId ?? 'N/A'} showCopy={false} />
                    <InfoCard icon={Mail} label="Email" value={user.email ?? 'Not available'} showCopy={false} />
                    <InfoCard icon={School} label="Academic Level" value={userLevel ?? 'Not Specified'} showCopy={false} />
                    <InfoCard icon={Badge} label="Secret Code" value={user.secretCodeHash} isSecret onEdit={() => setShowChangeSecretCode(true)} />
                </div>
            </CollapsibleSection>
             <CollapsibleSection title="Active Sessions" icon={Activity} defaultOpen={true}>
                <ActiveSessions user={user} />
            </CollapsibleSection>
        </div>

        <div className="hidden lg:block self-stretch w-px bg-slate-700/80" />

        <div className="flex flex-col space-y-6 sm:space-y-8 min-w-0">
            <CollapsibleSection title="Favorites" icon={Star} defaultOpen={true}>
                <FavoritesSection user={user} onFileClick={handleFileClick} />
            </CollapsibleSection>
            <CollapsibleSection title="Notes" icon={NotebookPen} defaultOpen={false}>
                <ProfileNotesSection user={user} />
            </CollapsibleSection>
            <CollapsibleSection title="Achievements" icon={Crown} defaultOpen={true}>
               <AchievementsSection user={user} />
            </CollapsibleSection>
        </div>
    </div>
  );

  const MobileLayout = () => (
      <div className="mt-8 sm:mt-12 flex flex-col gap-y-8 items-start w-full px-4 sm:px-8">
          <CollapsibleSection title="User Information" icon={Info} defaultOpen={false}>
              <div className="space-y-3 sm:space-y-4">
                  <InfoCard icon={Badge} label="Student ID" value={user.studentId ?? 'N/A'} showCopy={false} />
                  <InfoCard icon={Mail} label="Email" value={user.email ?? 'Not available'} showCopy={false} />
                  <InfoCard icon={School} label="Academic Level" value={userLevel ?? 'Not Specified'} showCopy={false} />
                  <InfoCard icon={Badge} label="Secret Code" value={user.secretCodeHash} isSecret onEdit={() => setShowChangeSecretCode(true)} />
              </div>
          </CollapsibleSection>
          <CollapsibleSection title="Favorites" icon={Star} defaultOpen={false}>
              <FavoritesSection user={user} onFileClick={handleFileClick} />
          </CollapsibleSection>
          <CollapsibleSection title="Notes" icon={NotebookPen} defaultOpen={false}>
              <ProfileNotesSection user={user} />
          </CollapsibleSection>
          <CollapsibleSection title="Achievements" icon={Crown} defaultOpen={false}>
             <AchievementsSection user={user} />
          </CollapsibleSection>
           <CollapsibleSection title="Active Sessions" icon={Activity} defaultOpen={false}>
              <ActiveSessions user={user} />
          </CollapsibleSection>
      </div>
  );

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full pb-12"
    >
      <div 
        className="relative group/cover sm:h-64 h-36"
        {...handleDragEvents(setIsCoverDragging)}
        onDrop={(e) => handleDrop(e, 'cover')}
      >
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
          {isCoverDragging && (
            <div className="absolute inset-0 bg-black/50 border-4 border-dashed border-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-lg z-10 pointer-events-none">
              Drop to change cover
            </div>
          )}
      </div>

      <div className="relative z-10 flex flex-col items-center -mt-12 sm:-mt-16 px-4 sm:px-8 sm:flex-row sm:items-end sm:gap-4">
        <div 
            className="relative group/avatar"
            {...handleDragEvents(setIsAvatarDragging)}
            onDrop={(e) => handleDrop(e, 'avatar')}
        >
          <Avatar className={cn("h-20 w-20 sm:h-28 sm:w-28 ring-4 transition-all", avatarRingClass, isAvatarDragging && "ring-blue-400")}>
            <AvatarImage 
                src={user.photoURL ?? ''} 
                alt={user.displayName ?? ''}
                className="pointer-events-none select-none"
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
            />
            <AvatarFallback className="text-3xl sm:text-4xl">
              {user.displayName?.[0] || <UserIcon />}
            </AvatarFallback>
          </Avatar>
           {isAvatarDragging && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-xs font-bold text-center p-2 pointer-events-none">
                    Drop Image
                </div>
            )}
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
            <div className="flex flex-col items-center sm:items-start mt-2 sm:mt-0">
              <div className="flex items-center gap-2">
                <h1
                  ref={nameInputRef}
                  contentEditable={editingName}
                  suppressContentEditableWarning={true}
                  onClick={() => !editingName && setEditingName(true)}
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
                    "text-xl sm:text-3xl font-bold outline-none whitespace-nowrap cursor-pointer sm:cursor-default",
                    editingName && "ring-2 ring-blue-500 rounded-md px-2 focus:bg-white/10"
                  )}
                >
                  {user.displayName}
                </h1>
                {!editingName && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full sm:group-hover:opacity-100 sm:opacity-0 transition-opacity flex-shrink-0 hidden sm:flex" onClick={() => setEditingName(true)}>
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
      
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
      
      <div className="mt-12 sm:mt-16 flex justify-center">
          <button onClick={() => setShowLogoutConfirm(true)} className="expanding-btn destructive">
              <LogOut size={20} />
              <span className="expanding-text">Logout</span>
          </button>
      </div>

    </motion.div>

    <ChangeSecretCodeDialog
        open={showChangeSecretCode}
        onOpenChange={setShowChangeSecretCode}
        userId={user.id}
    />

    <AlertDialog open={!!imageToConfirm} onOpenChange={(open) => !open && setImageToConfirm(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Image Change</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to set this image as your new {imageToConfirm?.type === 'avatar' ? 'profile picture' : 'cover photo'}?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-center my-4">
                {confirmationImagePreview && (
                    <Image
                        src={confirmationImagePreview}
                        alt="Image preview"
                        width={imageToConfirm?.type === 'avatar' ? 128 : 256}
                        height={imageToConfirm?.type === 'avatar' ? 128 : 128}
                        className={cn("object-cover rounded-lg", imageToConfirm?.type === 'avatar' && "rounded-full h-32 w-32")}
                    />
                )}
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setImageToConfirm(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmImageUpload}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
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
            <AlertDialogAction onClick={() => logout()} className="bg-red-600 hover:bg-red-700">Log Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Suspense fallback={null}>
        {previewFile && (
            <FilePreviewModal
                item={previewFile}
                onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
            />
        )}
      </Suspense>
    </>
  );
}
