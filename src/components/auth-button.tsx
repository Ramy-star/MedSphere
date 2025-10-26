
'use client';
import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, setPersistence, browserLocalPersistence, getRedirectResult } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn, LogOut, User, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleIcon } from './icons/GoogleIcon';
import { useUserProfile } from '@/hooks/use-user-profile';
import { RenameUsernameDialog } from './RenameUsernameDialog';


export function AuthButton({ forceLogin = false }: { forceLogin?: boolean }) {
  const { auth } = useFirebase();
  const { user, loading } = useUser();
  const { userProfile, loading: loadingProfile } = useUserProfile(user?.uid);
  const [busy, setBusy] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const handleLogin = async () => {
    setBusy(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      
      try {
        await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        console.warn('Popup sign-in failed, falling back to redirect:', popupErr?.code);
        if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/operation-not-allowed'].includes(popupErr?.code)) {
          await signInWithRedirect(auth, provider);
        } else {
          throw popupErr;
        }
      }
    } catch (err: any) {
      console.error('Login error', err);
      alert('Login failed: ' + (err?.message || 'An unknown error occurred.'));
    } finally {
      // Don't set busy to false for redirect flow
      // as the page will navigate away.
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading || busy || loadingProfile) {
    return <div className="h-9 w-9 rounded-full bg-slate-800 animate-pulse" />;
  }

  if (forceLogin) {
    return (
        <Button onClick={handleLogin} disabled={busy} size="lg" className={cn("rounded-full px-6 py-3 bg-slate-700/50 hover:bg-slate-700/80 text-white font-semibold transition-transform active:scale-95")}>
            <GoogleIcon className="mr-2 h-5 w-5" />
            Sign in with Google
        </Button>
    )
  }

  if (user && !user.isAnonymous) {
    return (
      <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-2 border-slate-700" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
               <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold leading-none">
                      {userProfile?.username || user.displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground mt-1">
                      {user.email}
                    </p>
                  </div>
                   <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setShowRenameDialog(true)}>
                      <Pencil className="h-4 w-4" />
                   </Button>
               </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {userProfile && (
        <RenameUsernameDialog
            open={showRenameDialog}
            onOpenChange={setShowRenameDialog}
            currentUsername={userProfile.username}
            userId={user.uid}
        />
      )}
      </>
    );
  }

  return (
    <Button onClick={handleLogin} disabled={busy} size="icon" className="rounded-full h-9 w-9" variant="ghost">
       {busy ? '...' : <LogIn className="h-4 w-4" />}
    </Button>
  );
}
