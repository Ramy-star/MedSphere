'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Edit, Loader2, Save, User as UserIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { contentService } from '@/lib/contentService';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
        await contentService.uploadAndSetIcon(user.id, file, {
            onProgress: (progress) => { /* Can show progress if needed */ },
            onSuccess: (url) => {
                setUser({ ...user, photoURL: url });
                toast({ title: 'Success', description: 'Profile picture updated.' });
            },
            onError: (err) => {
                 toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
            }
        }, true); // Pass true for isUserAvatar
    } catch (error) {
        console.error('Error uploading avatar:', error);
    } finally {
        setIsUploading(false);
    }
  };
  
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
  const avatarRingClass = isSuperAdmin ? "ring-yellow-400" : isSubAdmin ? "ring-slate-400" : "ring-transparent";


  return (
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
        <Button
          size="icon"
          className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-slate-800/80 hover:bg-slate-700/90 border border-slate-600 group-hover:opacity-100 md:opacity-0 transition-opacity"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Camera className="w-5 h-5" />}
        </Button>
      </div>

      <div className="mt-8 text-center flex items-center gap-3 group">
            {editingName ? (
              <div className="flex items-center gap-2">
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
                 <Button size="icon" onClick={handleSaveName} disabled={isSavingName} className="h-9 w-9 rounded-full">
                    {isSavingName ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                </Button>
                 <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-9 w-9 rounded-full">
                    <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
                <>
                    <h1 className="text-4xl font-bold">{user.displayName}</h1>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full group-hover:opacity-100 md:opacity-0 transition-opacity" onClick={() => setEditingName(true)}>
                    <Edit className="w-5 h-5" />
                    </Button>
                </>
            )}
      </div>
      <p className={cn("mt-2 text-lg font-medium", roleColor)}>{roleText}</p>

      <div className="mt-12 w-full max-w-md space-y-4">
        <div className="flex flex-col">
            <span className="text-sm text-slate-400">Student ID</span>
            <p className="text-lg font-mono p-3 bg-black/20 rounded-lg">{user.studentId}</p>
        </div>
         <div className="flex flex-col">
            <span className="text-sm text-slate-400">Email</span>
            <p className="text-lg font-mono p-3 bg-black/20 rounded-lg">{user.email}</p>
        </div>
        <div className="flex flex-col">
            <span className="text-sm text-slate-400">Academic Level</span>
            <p className="text-lg font-mono p-3 bg-black/20 rounded-lg">{user.level || 'Not Specified'}</p>
        </div>
      </div>
    </motion.div>
  );
}
