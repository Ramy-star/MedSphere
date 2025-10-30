'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, ShieldCheck, Search, UserCog, Loader2, Ban, Shield, Settings, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/stores/auth-store';

interface UserProfileExtended extends UserProfile {
  isBlocked?: boolean;
}

function UserManagementPage() {
    const { user, isSuperAdmin, loading: userLoading } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();

    const { data: allUsers, loading: usersLoading } = useCollection<UserProfileExtended>('users', {
        disabled: !isSuperAdmin
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

    // Redirect if user is not a super admin
    useEffect(() => {
        if (!userLoading && !isSuperAdmin) {
            router.replace('/');
        }
    }, [userLoading, isSuperAdmin, router]);

    const filteredUsers = debouncedSearchTerm
        ? allUsers?.filter(u =>
            u.displayName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            u.studentId?.includes(debouncedSearchTerm)
          )
        : allUsers;
        
    const handleToggleBlock = async (targetUser: UserProfileExtended) => {
        if (!isSuperAdmin) return;
        
        const isCurrentlyBlocked = targetUser.isBlocked ?? false;
        const userRef = doc(db, 'users', targetUser.uid || targetUser.id || targetUser.studentId || '');

        try {
            const batch = writeBatch(db);
            batch.update(userRef, { 'isBlocked': !isCurrentlyBlocked });
            await batch.commit();
            toast({
                title: isCurrentlyBlocked ? 'User Unblocked' : 'User Blocked',
                description: `${targetUser.displayName} has been ${isCurrentlyBlocked ? 'unblocked' : 'blocked'}.`
            });
        } catch (error) {
            console.error("Failed to toggle block status:", error);
            toast({
                variant: 'destructive',
                title: 'Operation Failed',
                description: 'Could not update the user\'s block status.'
            });
        }
    };


    if (userLoading || !isSuperAdmin) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <UserCog className="w-8 h-8 text-cyan-400" />
                    <h1 className="text-3xl font-bold text-white">User Management</h1>
                </div>
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="Search by name, email, or ID..."
                        className="pl-10 bg-slate-800/60 border-slate-700 rounded-xl h-11"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar">
                {usersLoading ? (
                     <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-1 gap-4"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.05,
                                },
                            },
                        }}
                        initial="hidden"
                        animate="visible"
                    >
                        {filteredUsers && filteredUsers.map((u) => {
                            const isBlocked = u.isBlocked ?? false;
                            const isCurrentUserSuperAdmin = u.roles?.some(r => r.role === 'superAdmin');
                            const isSubAdmin = u.roles?.some(r => r.role === 'subAdmin') && !isCurrentUserSuperAdmin;
                            
                            return (
                                <motion.div
                                    key={u.uid || u.id || u.studentId || ''}
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { opacity: 1, y: 0 },
                                    }}
                                    className={cn("glass-card p-4 rounded-2xl flex items-center justify-between hover:bg-slate-800/60 transition-colors", isBlocked && "opacity-60 bg-red-900/20")}
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar className={cn(
                                            "h-12 w-12",
                                            isCurrentUserSuperAdmin && "ring-2 ring-offset-2 ring-offset-background ring-yellow-400",
                                            isSubAdmin && "ring-2 ring-offset-2 ring-offset-background ring-slate-400"
                                        )}>
                                            <AvatarImage src={u.photoURL} />
                                            <AvatarFallback>
                                                <UserIcon className="w-6 h-6" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-white">{u.displayName}</p>
                                            <p className="text-sm text-slate-400">{u.email}</p>
                                            <p className="text-xs text-slate-500 font-mono">{u.studentId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isCurrentUserSuperAdmin ? (
                                            <div className="flex items-center gap-1 text-yellow-400 text-sm font-semibold p-2 bg-yellow-400/10 rounded-lg">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>Super Admin</span>
                                            </div>
                                        ) : isSubAdmin ? (
                                             <div className="flex items-center gap-1 text-slate-300 text-sm font-semibold p-2 bg-slate-400/10 rounded-lg">
                                                <Shield className="w-4 h-4" />
                                                <span>Sub Admin</span>
                                            </div>
                                        ) : null}
                                        
                                        {isBlocked && (
                                            <div className="flex items-center gap-1 text-red-400 text-sm font-semibold p-2 bg-red-400/10 rounded-lg">
                                                <Ban className="w-4 h-4" />
                                                <span>Blocked</span>
                                            </div>
                                        )}

                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => { alert('Manage Roles UI to be implemented') }}>
                                            <Settings className="w-4 h-4" />
                                        </Button>

                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn("h-8 w-8 rounded-full", isBlocked ? "text-green-400 hover:text-green-300" : "text-red-400 hover:text-red-300")}
                                            onClick={() => handleToggleBlock(u)}
                                        >
                                            <Ban className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default UserManagementPage;