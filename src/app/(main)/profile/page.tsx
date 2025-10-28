'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Edit, Loader2, Save, User as UserIcon, X, Trash2, Crown, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { contentService } from '@/lib/contentService';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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

const studentIdToLevelMap = new Map<string, string>();
level1Ids.forEach(id => studentIdToLevelMap.set(id, 'Level 1'));
level2Ids.forEach(id => studentIdToLevelMap.set(id, 'Level 2'));
level3Ids.forEach(id => studentIdToLevelMap.set(id, 'Level 3'));
level4Ids.forEach(id => studentIdToLevelMap.set(id, 'Level 4'));
level5Ids.forEach(id => studentIdToLevelMap.set(id, 'Level 5'));


export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const handleSaveName = async () => {
    if (!user || displayName.trim() === '' || displayName.trim() === user.displayName) {
      setEditingName(false);
      setDisplayName(user?.displayName || ''); // Revert if empty or unchanged
      return;
    }
    setIsSavingName(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { displayName: displayName.trim() });
      setUser({ ...user, displayName: displayName.trim() });
      toast({ title: 'Success', description: 'Your name has been updated.' });
      setEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your name.' });
    } finally {
      setIsSavingName(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingName(false);
    setDisplayName(user?.displayName || '');
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
        const { url } = await contentService.uploadUserAvatar(user, file, (progress) => {});
        setUser({ ...user, photoURL: url });
        toast({ title: 'Success', description: 'Profile picture updated.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        console.error('Error uploading avatar:', error);
    } finally {
        setIsUploading(false);
    }
  };

  const handleDeletePicture = async () => {
      if (!user) return;
      setIsUploading(true);
      try {
          await contentService.deleteUserAvatar(user);
          setUser({ ...user, photoURL: undefined });
          toast({ title: 'Success', description: 'Profile picture removed.' });
      } catch(error: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not remove profile picture.' });
          console.error("Error deleting avatar:", error);
      } finally {
          setIsUploading(false);
          setShowDeleteConfirm(false);
      }
  }
  
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = user.roles?.some(r => r.role === 'superAdmin');
  const isSubAdmin = user.roles?.some(r => r.role === 'subAdmin') && !isSuperAdmin;

  const roleText = isSuperAdmin ? 'Super Admin' : isSubAdmin ? 'Admin' : 'Student';
  const roleColor = isSuperAdmin ? 'text-yellow-400' : isSubAdmin ? 'text-blue-400' : 'text-slate-300';
  const RoleIcon = isSuperAdmin ? Crown : isSubAdmin ? Shield : UserIcon;
  const avatarRingClass = isSuperAdmin ? "ring-yellow-400" : isSubAdmin ? "ring-slate-400" : "ring-transparent";
  const userLevel = user.level || studentIdToLevelMap.get(user.studentId) || 'Not Specified';


  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center pt-8 md:pt-16"
    >
      <div className="relative group">
        <Avatar className={cn("h-32 w-32 ring-4 ring-offset-4 ring-offset-background transition-all", avatarRingClass)}>
          <AvatarImage src={user.photoURL} alt={user.displayName} />
          <AvatarFallback className="text-4xl">
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
              className="h-8 w-8 rounded-full bg-slate-800/80 hover:bg-slate-700/90 border border-slate-600 group-hover:opacity-100 md:opacity-0 transition-opacity"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4" />}
            </Button>
            {user.photoURL && (
                <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-full bg-red-800/80 hover:bg-red-700/90 border border-red-600 group-hover:opacity-100 md:opacity-0 transition-opacity"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isUploading}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>
      </div>

      <div className="mt-8 text-center flex items-center justify-center gap-2 group w-full max-w-lg">
            {editingName ? (
              <div className="flex items-center gap-2 w-full justify-center">
                <Input
                  ref={nameInputRef}
                  value={displayName}
                  onChange={handleNameChange}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="text-4xl font-bold h-auto bg-transparent border-none focus-visible:ring-0 focus:border-none p-0 text-center w-auto max-w-[40ch]"
                />
                 <Button size="icon" onClick={handleSaveName} disabled={isSavingName} className="h-9 w-9 rounded-full flex-shrink-0">
                    {isSavingName ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                </Button>
                 <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-9 w-9 rounded-full flex-shrink-0">
                    <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
                <>
                    <h1 className="text-4xl font-bold truncate">{user.displayName}</h1>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full group-hover:opacity-100 md:opacity-0 transition-opacity flex-shrink-0" onClick={() => setEditingName(true)}>
                    <Edit className="w-5 h-5" />
                    </Button>
                </>
            )}
      </div>
      <p className={cn("mt-2 text-lg font-medium flex items-center gap-2", roleColor)}>
        <RoleIcon className="w-5 h-5" />
        {roleText}
      </p>

      <div className="mt-12 w-full max-w-xl space-y-4">
        <div className="glass-card p-4 rounded-xl">
            <span className="text-sm text-slate-400">Student ID</span>
            <p className="text-lg font-mono text-white mt-1">{user.studentId}</p>
        </div>
         <div className="glass-card p-4 rounded-xl">
            <span className="text-sm text-slate-400">Email</span>
            <p className="text-lg font-mono text-white mt-1">{user.email}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
            <span className="text-sm text-slate-400">Academic Level</span>
            <p className="text-lg font-mono text-white mt-1">{userLevel}</p>
        </div>
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
    </>
  );
}
