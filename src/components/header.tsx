
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Menu, Wand2, Shield, User as UserIcon, Inbox, Users, Home, NotebookPen, Palette } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth-store';
import { AuthButton } from './auth-button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogFooter
} from "@/components/ui/alert-dialog";
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery] = useDebounce(query, 1000);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const { can, user } = useAuthStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (debouncedQuery) {
      router.push(`/search?q=${debouncedQuery}`);
    } 
    else if (!query && pathname === '/search') {
      router.push('/');
    }
  }, [debouncedQuery, query, router, pathname]);
  
  useEffect(() => {
    const currentQuery = searchParams.get('q');
    if (currentQuery !== query) {
        setQuery(currentQuery || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleClearSearch = () => {
      setQuery('');
  }

  const handleCommunityClick = () => {
    if (can('canAccessAdminPanel', null)) {
      router.push('/community');
    } else {
      setShowComingSoon(true);
    }
  };

  const navItems = [
    {
      label: 'Profile',
      icon: UserIcon,
      action: () => router.push('/profile'),
      permission: () => !!user,
    },
    {
      label: 'Community',
      icon: Users,
      action: handleCommunityClick,
      permission: () => true, // Logic is handled in the action
    },
    {
      label: 'Questions Creator',
      icon: Wand2,
      action: () => router.push('/questions-creator'),
      permission: () => can('canAccessQuestionCreator', null),
    },
    {
      label: 'My Notes',
      icon: NotebookPen,
      action: () => router.push('/notes'),
      permission: () => !!user,
    },
    {
      label: 'News Studio',
      icon: Palette,
      action: () => router.push('/studio/news'),
      permission: () => can('canAccessAdminPanel', null),
    },
    {
      label: 'Telegram Inbox',
      icon: Inbox,
      action: () => router.push('/folder/telegram-inbox-folder'),
      permission: () => can('canAccessTelegramInbox', null),
    },
    {
      label: 'Admin Panel',
      icon: Shield,
      action: () => router.push('/admin'),
      permission: () => can('canAccessAdminPanel', null),
    },
  ].sort((a, b) => {
    const order = ['Profile', 'Community', 'Questions Creator', 'My Notes', 'News Studio', 'Telegram Inbox', 'Admin Panel'];
    return order.indexOf(a.label) - order.indexOf(b.label);
  });

  const visibleNavItems = navItems.filter(item => item.permission());


  const DesktopNav = () => (
    <div className="hidden md:flex items-center gap-1">
        <TooltipProvider>
            {can('canAccessAdminPanel', null) && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-300 hover:text-teal-300" onClick={() => router.push('/admin')}>
                            <Shield className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>Admin Panel</p>
                    </TooltipContent>
                </Tooltip>
            )}
            {can('canAccessTelegramInbox', null) && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-300 hover:text-blue-400" onClick={() => router.push('/folder/telegram-inbox-folder')}>
                            <Inbox className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>Telegram Inbox</p>
                    </TooltipContent>
                </Tooltip>
            )}
             {can('canAccessAdminPanel', null) && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-300 hover:text-orange-400" onClick={() => router.push('/studio/news')}>
                            <Palette className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>News Studio</p>
                    </TooltipContent>
                </Tooltip>
            )}
            {!!user && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-300 hover:text-yellow-300" onClick={() => router.push('/notes')}>
                            <NotebookPen className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>My Notes</p>
                    </TooltipContent>
                </Tooltip>
            )}
            {can('canAccessQuestionCreator', null) && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-300 hover:text-yellow-300" onClick={() => router.push('/questions-creator')}>
                            <Wand2 className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>Questions Creator</p>
                    </TooltipContent>
                </Tooltip>
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-300 hover:text-purple-400" onClick={handleCommunityClick}>
                        <Users className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                    <p>Community</p>
                </TooltipContent>
            </Tooltip>
            <AuthButton />
        </TooltipProvider>
    </div>
  );

  const MobileNav = () => (
      <div className="md:hidden">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div><AuthButton /></div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-2" align="end">
                {visibleNavItems.map(item => (
                    <DropdownMenuItem key={item.label} onSelect={item.action}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
  );


  return (
    <>
    <header className="w-full border-b border-white/10 bg-white/5 backdrop-blur-sm shadow-sm px-4 sm:px-6 py-3 min-h-[68px] flex items-center gap-4">
      <div className="flex items-center gap-2 cursor-default select-none">
          <Logo className="h-8 sm:h-10 w-auto shrink-0" />
          <h1 className="text-lg sm:text-xl font-['Nunito_Sans',_sans-serif] relative" style={{ top: '1px' }}>
            <span className="font-bold" style={{ color: '#FFFFFF' }}>Med</span>
            <span className="font-normal" style={{ color: '#00D309' }}>Sphere</span>
          </h1>
      </div>

      <div className="flex items-center justify-end flex-grow gap-2">
        <div className="relative w-full max-w-[180px] sm:max-w-sm">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300",
              (isSearchFocused || query) ? 'text-white' : 'text-slate-400',
              isSearchFocused && "transform rotate-90"
            )}
          />
          <Input
            placeholder="Search files..."
            className="pl-9 sm:pl-10 pr-10 bg-black/20 border-white/10 rounded-full h-9 sm:h-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {query && (
              <Button 
                  variant="ghost" 
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-slate-400 hover:text-white"
                  onClick={handleClearSearch}
              >
                  <X className="w-5 h-5" />
              </Button>
          )}
        </div>
        
        {isMobile ? <MobileNav /> : <DesktopNav />}
      </div>
    </header>

    <AlertDialog open={showComingSoon} onOpenChange={setShowComingSoon}>
      <AlertDialogContent>
        <AlertDialogHeader className="items-center">
            <div className="p-4 bg-purple-500/20 rounded-full mb-4">
                <Users className="w-10 h-10 text-purple-400" />
            </div>
            <AlertDialogTitle className="text-2xl">Community Coming Soon!</AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
                We're building an exciting new space for students to connect, share, and learn together. Stay tuned for updates!
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
