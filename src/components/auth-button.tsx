'use client';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


export function AuthButton() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  if (loading) {
    return <div className="h-9 w-9 rounded-full bg-slate-800 animate-pulse" />;
  }

  if (user) {
    const isSuperAdmin = user.roles?.some(r => r.role === 'superAdmin');
    const isSubAdmin = user.roles?.some(r => r.role === 'subAdmin') && !isSuperAdmin;
    const avatarRingClass = isSuperAdmin ? "ring-yellow-400" : isSubAdmin ? "ring-slate-400" : "ring-transparent";
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-9 w-9 rounded-full p-0"
              onClick={() => router.push('/profile')}
            >
              <Avatar className={cn("h-9 w-9 ring-2 ring-offset-2 ring-offset-background transition-all", avatarRingClass)}>
                <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                <AvatarFallback>
                  <UserIcon className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            <p>My Profile</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null; // Don't show anything if not logged in, as VerificationScreen handles it.
}
