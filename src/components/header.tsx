'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Menu, Wand2, Shield, User as UserIcon, Inbox, Users, Home, NotebookPen, Palette, Camera } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
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
import { AdvancedSearchDialog } from './AdvancedSearchDialog';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';


export const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const { can, user } = useAuthStore();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handleScreenshot = useCallback(async () => {
    const mainContent = document.documentElement;
    if (!mainContent) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find the content to capture.",
      });
      return;
    }

    try {
      const dataUrl = await toPng(mainContent, { 
        cacheBust: true,
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
            if (node.hasAttribute && node.hasAttribute('data-radix-tooltip-content')) {
                return false;
            }
            return true;
        }
      });
      const link = document.createElement('a');
      link.download = `medsphere-screenshot-${new Date().toISOString()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Oops, something went wrong!', err);
      toast({
        variant: "destructive",
        title: "Screenshot Failed",
        description: "Could not capture the screen. Please try again.",
      });
    }
  }, [toast]);
  
  useKeyboardShortcuts({
    onSearch: () => setShowAdvancedSearch(true),
    onScreenshot: handleScreenshot,
  });

  const handleCommunityClick = () => {
    if (can('canAccessCommunityPage', null)) {
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
      permission: () => true, // The action itself contains the permission logic
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
                        <Button variant="ghost" size="icon" id="screenshot-button" className="rounded-full h-9 w-9 text-slate-300 hover:text-green-400" onClick={handleScreenshot}>
                            <Camera className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>Take Screenshot (Ctrl+M)</p>
                    </TooltipContent>
                </Tooltip>
            )}
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
        <Button
            variant="outline"
            onClick={() => setShowAdvancedSearch(true)}
            className="h-9 sm:h-10 rounded-full bg-black/20 border-white/10 hover:bg-black/30 text-slate-400 hover:text-white transition-colors px-4"
        >
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="ml-2 text-sm hidden sm:inline">Search</span>
        </Button>
        
        {isMobile ? <MobileNav /> : <DesktopNav />}
      </div>
    </header>

    <AdvancedSearchDialog open={showAdvancedSearch} onOpenChange={setShowAdvancedSearch} />

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
