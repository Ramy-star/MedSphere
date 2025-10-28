'use client';
import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, setPersistence, browserLocalPersistence, getRedirectResult } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
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
import { RenameUsernameDialog } from './RenameUsernameDialog';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';


export function AuthButton({ forceLogin = false }: { forceLogin?: boolean }) {
  const { auth } = useFirebase();
  const { user, isSuperAdmin, isSubAdmin, loading, logout } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // This function is likely not used anymore since login is handled by the verification screen
    // but we keep it for potential fallback.
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || busy) {
    return <div className="h-9 w-9 rounded-full bg-slate-800 animate-pulse" />;
  }

  if (user) {
    const avatarRingClass = isSuperAdmin ? "ring-yellow-400" : isSubAdmin ? "ring-slate-400" : "ring-transparent";
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className={cn("h-9 w-9 ring-2 ring-offset-2 ring-offset-background transition-all", avatarRingClass)}>
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
                        {user.displayName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        {user.email}
                      </p>
                    </div>
                     <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => router.push('/profile')}>
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
        {user && (
            <RenameUsernameDialog
                open={showRenameDialog}
                onOpenChange={setShowRenameDialog}
                currentUsername={user.username}
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
