

'use client';

import { Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, Trash2, UserPlus, Crown, Shield, User, SearchX, Settings, Ban, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { useCollection } from '@/firebase/firestore/use-collection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { AddUserDialog } from '@/components/AddUserDialog';
import { doc, updateDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PermissionsDialog } from '@/components/PermissionsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


const SUPER_ADMIN_ID = "221100154";

type UserRole = {
    role: 'superAdmin' | 'subAdmin';
    scope: 'global' | 'level' | 'semester' | 'subject' | 'folder';
    scopeId?: string;
    scopeName?: string;
    permissions?: string[];
};

type UserProfile = {
    uid: string;
    username: string;
    studentId: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    roles?: UserRole[];
    isBlocked?: boolean;
};


function AdminPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'users';

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery] = useDebounce(searchQuery, 300);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showAddUserDialog, setShowAddUserDialog] = useState(false);
    const [userForPermissions, setUserForPermissions] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [userToDemote, setUserToDemote] = useState<UserProfile | null>(null);


    const { data: users, loading: loadingUsers } = useCollection<UserProfile>('users');
    const { studentId: currentStudentId } = useAuthStore();
    const { toast } = useToast();

    const handleTabChange = (value: string) => {
        router.push(`/admin?tab=${value}`, { scroll: false });
    };

    const isSuperAdmin = useCallback((user: UserProfile) => {
        return user.studentId === SUPER_ADMIN_ID;
    }, []);
    
    const isSubAdmin = useCallback((user: UserProfile) => {
       return Array.isArray(user.roles) && user.roles.some(r => r.role === 'subAdmin');
    }, []);

    const sortedUsers = useMemo(() => {
        if (!users) return [];
        const uniqueUsers = Array.from(new Map(users.map(user => [user.uid, user])).values());
        
        return uniqueUsers.sort((a, b) => {
            const aIsSuper = isSuperAdmin(a);
            const bIsSuper = isSuperAdmin(b);
            if (aIsSuper && !bIsSuper) return -1;
            if (!aIsSuper && bIsSuper) return 1;
            return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
        });
    }, [users, isSuperAdmin]);


    const filteredUsers = useMemo(() => {
        if (!sortedUsers) return [];
        if (!debouncedQuery) return sortedUsers;
        const lowercasedQuery = debouncedQuery.toLowerCase();
        return sortedUsers.filter(user => 
            user.displayName?.toLowerCase().includes(lowercasedQuery) ||
            user.username?.toLowerCase().includes(lowercasedQuery) ||
            user.email?.toLowerCase().includes(lowercasedQuery) ||
            user.studentId?.includes(lowercasedQuery)
        );
    }, [sortedUsers, debouncedQuery]);
    
    
    const admins = useMemo(() => {
        if (!filteredUsers) return [];
        return filteredUsers.filter(user => isSuperAdmin(user) || isSubAdmin(user));
    }, [filteredUsers, isSubAdmin, isSuperAdmin]);
    
    const handleToggleSubAdmin = useCallback(async (user: UserProfile) => {
        const userRef = doc(db, 'users', user.uid);
        const hasSubAdminRole = isSubAdmin(user);

        if (hasSubAdminRole) {
            setUserToDemote(user);
            return;
        }

        try {
            const newSubAdminRole: UserRole = { role: 'subAdmin', scope: 'global', permissions: [] };
            const currentRoles = Array.isArray(user.roles) ? user.roles : [];
            await updateDoc(userRef, {
                roles: [...currentRoles, newSubAdminRole]
            });
            toast({ title: "Permissions Updated", description: `${user.displayName} is now an admin.` });
        } catch (error: any) {
            console.error("Error updating user role:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update user permissions." });
        }
    }, [isSubAdmin, toast]);

    const handleDemoteConfirm = useCallback(async () => {
        if (!userToDemote) return;
        const userRef = doc(db, 'users', userToDemote.uid);
        try {
            const newRoles = Array.isArray(userToDemote.roles) ? userToDemote.roles.filter(r => r.role !== 'subAdmin') : [];
            await updateDoc(userRef, { roles: newRoles });
            toast({ title: "Permissions Updated", description: `${userToDemote.displayName} is no longer an admin.` });
        } catch(error: any) {
            console.error("Error demoting user:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update user permissions." });
        } finally {
            setUserToDemote(null);
        }
    }, [userToDemote, toast]);
    
    const handleToggleBlock = useCallback(async (user: UserProfile) => {
        const userRef = doc(db, 'users', user.uid);
        const newBlockState = !user.isBlocked;
        try {
            await updateDoc(userRef, { isBlocked: newBlockState });
            toast({ 
                title: `User ${newBlockState ? 'Blocked' : 'Unblocked'}`, 
                description: `${user.displayName} has been ${newBlockState ? 'blocked' : 'unblocked'}.`
            });
        } catch (error: any) {
            console.error("Error toggling user block state:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update user status." });
        }
    }, [toast]);

    const handleDeleteUser = useCallback(async () => {
        if (!userToDelete) return;
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userToDelete.uid);
        batch.delete(userRef);
        await batch.commit();
        toast({ title: "User Deleted", description: `${userToDelete.displayName} has been deleted.` });
        setUserToDelete(null);
    }, [userToDelete, toast]);

    const UserCard = React.memo(({ user, isManagementView = false }: { user: UserProfile, isManagementView?: boolean }) => {
        const userIsSuperAdmin = isSuperAdmin(user);
        const userIsSubAdmin = isSubAdmin(user);
        const isCurrentUser = user.studentId === currentStudentId;

        const roleIcon = userIsSuperAdmin ? <Crown className="w-5 h-5 text-yellow-400" /> 
                       : userIsSubAdmin ? <Shield className="w-5 h-5 text-blue-400" />
                       : <User className="w-5 h-5 text-slate-400" />;

        const RoleText = () => {
          if (userIsSuperAdmin) {
            return <span className='text-yellow-400'>Super Admin</span>
          }
          if (userIsSubAdmin) {
            return <span className='text-blue-400'>Admin</span>
          }
          return <span className='text-slate-300'>User</span>;
        }
        
        return (
            <div 
                className={cn("glass-card p-4 rounded-2xl flex items-center justify-between", user.isBlocked && "opacity-50 bg-red-900/20")}
            >
                <div className="flex items-center gap-4 overflow-hidden">
                    <Avatar>
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{user.displayName?.[0] || user.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white truncate">{user.displayName || user.username} {isCurrentUser && '(You)'}</p>
                          {user.isBlocked && <span className="text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full">Blocked</span>}
                        </div>
                        <p className="text-sm text-slate-400 truncate">{user.email} • ID: {user.studentId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 text-sm">
                        {roleIcon}
                        <RoleText />
                    </div>
                   
                    {isManagementView && !userIsSuperAdmin && (
                        <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => handleToggleSubAdmin(user)}>
                            {userIsSubAdmin ? 'Remove Admin' : 'Promote to Admin'}
                        </Button>
                    )}

                     {isManagementView && !userIsSuperAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-400">
                                    <MoreVertical size={18} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-2">
                                <DropdownMenuItem onClick={() => handleToggleSubAdmin(user)}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    {userIsSubAdmin ? 'Remove Admin' : 'Promote to Admin'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleBlock(user)}>
                                    <Ban className="mr-2 h-4 w-4" />
                                    {user.isBlocked ? 'Unblock User' : 'Block User'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {activeTab === 'admins' && userIsSubAdmin && !userIsSuperAdmin && (
                         <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setUserForPermissions(user)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Permissions
                        </Button>
                    )}
                </div>
            </div>
        )
    });
    UserCard.displayName = 'UserCard';

    const renderUserList = useCallback((userList: UserProfile[] | null, isManagementView = false) => {
        if (loadingUsers && !userList) return null;
        if (!userList || userList.length === 0) {
            return (
                <div className="text-center text-slate-400 py-16 flex flex-col items-center">
                    <SearchX className="w-12 h-12 text-slate-500 mb-4"/>
                    <p className="font-semibold text-lg text-white">No Users Found</p>
                    <p>{debouncedQuery ? `Your search for "${debouncedQuery}" did not return any results.` : "There are no users in this category."}</p>
                </div>
            )
        }
        return userList.map(user => <UserCard key={user.uid} user={user} isManagementView={isManagementView} />);
    }, [loadingUsers, debouncedQuery, UserCard, handleToggleSubAdmin, handleToggleBlock]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
                <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
                        Admin Panel
                    </h1>
                </div>

                <div className="flex justify-between items-center mb-6 gap-4">
                     <div className="relative w-full max-w-sm">
                        <Search className={cn(
                            "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-300",
                            (isSearchFocused || searchQuery) ? 'text-white' : 'text-slate-400',
                            isSearchFocused && "transform rotate-90"
                        )} />
                        <Input 
                            placeholder="Search by name, email, or ID..."
                            className="pl-10 pr-10 bg-black/20 border-white/10 rounded-2xl h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                         {searchQuery && (
                            <Button 
                                variant="ghost" 
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-slate-400 hover:text-white"
                                onClick={() => setSearchQuery('')}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                     <Button onClick={() => setShowAddUserDialog(true)} className="rounded-2xl">
                       <UserPlus className="mr-2 h-4 w-4"/>
                       Add User
                   </Button>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col items-center">
                    <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-black/20 border-white/10 rounded-full p-1.5 h-12">
                        <TabsTrigger value="users">All Users ({filteredUsers?.length || 0})</TabsTrigger>
                        <TabsTrigger value="admins">Admins ({admins?.length || 0})</TabsTrigger>
                        <TabsTrigger value="management">Management ({filteredUsers?.length || 0})</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            
            <div className="flex-1 overflow-y-auto mt-6 no-scrollbar pr-2 -mr-2">
                <Tabs value={activeTab}>
                    <TabsContent value="users" className="space-y-4">
                        {renderUserList(filteredUsers)}
                    </TabsContent>
                    <TabsContent value="admins" className="space-y-4">
                        {renderUserList(admins)}
                    </TabsContent>
                    <TabsContent value="management" className="space-y-4">
                        {renderUserList(filteredUsers, true)}
                    </TabsContent>
                </Tabs>
            </div>
            <AddUserDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog} />
            
            <PermissionsDialog 
                user={userForPermissions} 
                open={!!userForPermissions} 
                onOpenChange={(isOpen) => {if(!isOpen) setUserForPermissions(null)}}
            />
             <AlertDialog open={!!userToDelete} onOpenChange={(open) => {if(!open) setUserToDelete(null)}}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete the user account for "{userToDelete?.displayName}". This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!userToDemote} onOpenChange={(open) => {if(!open) setUserToDemote(null)}}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Demotion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove admin privileges for "{userToDemote?.displayName}"?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDemoteConfirm} className="bg-red-600 hover:bg-red-700">Remove Admin</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={<div className="text-center">Loading...</div>}>
            <AdminPageContent />
        </Suspense>
    )
}
