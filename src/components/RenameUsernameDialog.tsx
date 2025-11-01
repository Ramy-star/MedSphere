'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUsernameAvailability } from '@/hooks/use-username-availability';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';


type RenameUsernameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsername: string;
  userId: string;
};

export function RenameUsernameDialog({ open, onOpenChange, currentUsername, userId }: RenameUsernameDialogProps) {
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAvailable, isLoading: isCheckingUsername, debouncedUsername } = useUsernameAvailability(newUsername, currentUsername);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setNewUsername(currentUsername);
    }
  }, [open, currentUsername]);

  const isUsernameValid = newUsername.trim().length >= 3 && /^[a-zA-Z0-9_ ]+$/.test(newUsername);
  const canSubmit = isUsernameValid && isAvailable === true && !isCheckingUsername && newUsername !== currentUsername;

  const handleRename = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    const userDocRef = doc(db, 'users', userId);
    try {
        await updateDoc(userDocRef, {
            username: newUsername.trim()
        });
        toast({ title: "Username updated successfully!" });
        onOpenChange(false);
    } catch (error) {
        console.error("Error updating username: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update username. Please try again."
        });
    } finally {
        setIsSubmitting(false);
    }
  };

   const getUsernameHint = () => {
        if (newUsername.length > 0 && !isUsernameValid) {
            return <p className="text-xs text-red-400 mt-1.5">Use only letters, numbers, spaces, and underscores (_).</p>;
        }
        if (debouncedUsername.length >= 3 && isCheckingUsername) {
            return <p className="text-xs text-slate-400 mt-1.5">Checking availability...</p>;
        }
        if (debouncedUsername.length >= 3 && !isCheckingUsername) {
            if (isAvailable) {
                return <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1"><CheckCircle2 size={14}/> Available!</p>;
            } else if (isAvailable === false) {
                 return <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><XCircle size={14} /> Not available.</p>;
            }
        }
        return <p className="text-xs text-slate-500 mt-1.5">Must be at least 3 characters.</p>;
    }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Edit Username</DialogTitle>
            <DialogDescription>
              Choose a new unique username.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
             <div className="relative w-full text-left">
                    <Input
                        type="text"
                        placeholder="Choose a username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="bg-slate-800/60 border-slate-700 text-white h-12 text-base rounded-xl pl-4 pr-10"
                        disabled={isSubmitting}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingUsername ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
                    </div>
                     <div className="px-2 h-5">
                        {getUsernameHint()}
                     </div>
                </div>
          </div>

          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="button" className="rounded-xl" onClick={handleRename} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
