
'use client';
import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { useFirebase } from '@/firebase';
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
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';


export function AuthButton() {
  const { auth } = useFirebase();
  const { user, loading } = useUser();
  const [busy, setBusy] = useState(false);

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
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <div className="h-9 w-20 rounded-full bg-slate-800 animate-pulse" />;
  }

  if (user && !user.isAnonymous) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
              <AvatarFallback>
                <UserIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 border-slate-700 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={handleLogin} disabled={busy} className="rounded-full" variant="outline">
       {busy ? '...' : <><LogIn className="mr-2 h-4 w-4" /> Log In</>}
    </Button>
  );
}
