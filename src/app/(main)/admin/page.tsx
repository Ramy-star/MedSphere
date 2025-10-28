

'use client';

import { Suspense, useMemo, useState, useCallback, useEffect, lazy } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, Trash2, UserPlus, Crown, Shield, User, SearchX, Settings, Ban, X, GraduationCap, ArrowUpDown, History } from 'lucide-react';
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore, type UserProfile, type UserRole } from '@/stores/auth-store';
import { AddUserDialog } from '@/components/AddUserDialog';
import { doc, updateDoc, writeBatch, collection, getDocs, addDoc } from 'firebase/firestore';
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
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from 'date-fns';

import level1Ids from '@/lib/student-ids/level-1.json';
import level2Ids from '@/lib/student-ids/level-2.json';
import level3Ids from '@/lib/student-ids/level-3.json';
import level4Ids from '@/lib/student-ids/level-4.json';
import level5Ids from '@/lib/student-ids/level-5.json';


const SUPER_ADMIN_ID = "221100154";

type AuditLog = {
    id: string;
    timestamp: string;
    actorId: string;
    actorName: string;
    action: string;
    targetId: string;
    targetName: string;
    details?: { [key: string]: any };
}

type SortOption = 'name' | 'createdAt' | 'level';

async function logAdminAction(actor: UserProfile, action: string, target: UserProfile, details?: object) {
    if (!db || !actor || !actor.id) return;
    try {
        await addDoc(collection(db, 'auditLogs'), {
            timestamp: new Date().toISOString(),
            actorId: actor.id,
            actorName: actor.displayName || actor.username,
            action: action,
            targetId: target.id,
            targetName: target.displayName || target.username,
            details: details || {}
        });
    } catch(error) {
        console.error("Failed to log admin action:", error);
    }
}


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
    const [sortOption, setSortOption] = useState<SortOption>('name');
    const [levelFilter, setLevelFilter] = useState<string | null>(null);
    const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);


    const { data: users, loading: loadingUsers } = useCollection<UserProfile>('users');
    const { data: auditLogs, loading: loadingLogs } = useCollection<AuditLog>('auditLogs', {
        orderBy: ['timestamp', 'desc'],
        limit: 100
    });
    const { studentId: currentStudentId, user: currentUser, isSuperAdmin } = useAuthStore();
    const { toast } = useToast();

    const studentIdToLevelMap = useMemo(() => {
        const map = new Map<string, string>();
        level1Ids.forEach(id => map.set(id, 'Level 1'));
        level2Ids.forEach(id => map.set(id, 'Level 2'));
        level3Ids.forEach(id => map.set(id, 'Level 3'));
        level4Ids.forEach(id => map.set(id, 'Level 4'));
        level5Ids.forEach(id => map.set(id, 'Level 5'));
        return map;
    }, []);

    const handleTabChange = (value: string) => {
        router.push(`/admin?tab=${value}`, { scroll: false });
    };

    const isUserSuperAdmin = useCallback((user: UserProfile) => {
        return user.studentId === SUPER_ADMIN_ID;
    }, []);
    
    const isSubAdmin = useCallback((user: UserProfile) => {
       return Array.isArray(user.roles) && user.roles.some(r => r.role === 'subAdmin');
    }, []);

    const filteredAndSortedUsers = useMemo(() => {
        if (!users) return [];
        let processedUsers = Array.from(new Map(users.map(user => [user.id, user])).values());

        // Apply search query filter
        if (debouncedQuery) {
            const lowercasedQuery = debouncedQuery.toLowerCase();
            processedUsers = processedUsers.filter(user => 
                user.displayName?.toLowerCase().includes(lowercasedQuery) ||
                user.username?.toLowerCase().includes(lowercasedQuery) ||
                user.email?.toLowerCase().includes(lowercasedQuery) ||
                user.studentId?.includes(lowercasedQuery)
            );
        }

        // Apply level filter
        if (levelFilter) {
            processedUsers = processedUsers.filter(user => (user.level || studentIdToLevelMap.get(user.studentId)) === levelFilter);
        }

        // Apply sorting
        return processedUsers.sort((a, b) => {
            const aIsSuper = isUserSuperAdmin(a);
            const bIsSuper = isUserSuperAdmin(b);
            if (aIsSuper && !bIsSuper) return -1;
            if (!aIsSuper && bIsSuper) return 1;

            switch (sortOption) {
                case 'createdAt':
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                case 'level':
                    const levelA = a.level || studentIdToLevelMap.get(a.studentId) || '';
                    const levelB = b.level || studentIdToLevelMap.get(b.studentId) || '';
                    return levelA.localeCompare(levelB);
                case 'name':
                default:
                    return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
            }
        });
    }, [users, debouncedQuery, levelFilter, sortOption, isUserSuperAdmin, studentIdToLevelMap]);


    const admins = useMemo(() => {
        if (!filteredAndSortedUsers) return [];
        return filteredAndSortedUsers.filter(user => isUserSuperAdmin(user) || isSubAdmin(user));
    }, [filteredAndSortedUsers, isSubAdmin, isUserSuperAdmin]);
    
    const handleToggleSubAdmin = useCallback(async (user: UserProfile) => {
        if (!currentUser) return;
        const userRef = doc(db, 'users', user.id);
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
            await logAdminAction(currentUser, 'user.promote', user, { to: 'admin' });
            toast({ title: "Permissions Updated", description: `${user.displayName} is now an admin.` });
        } catch (error: any) {
            console.error("Error updating user role:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update user permissions." });
        }
    }, [isSubAdmin, toast, currentUser]);

    const handleDemoteConfirm = useCallback(async () => {
        if (!userToDemote || !currentUser) return;
        const userRef = doc(db, 'users', userToDemote.id);
        try {
            const newRoles = Array.isArray(userToDemote.roles) ? userToDemote.roles.filter(r => r.role !== 'subAdmin') : [];
            await updateDoc(userRef, { roles: newRoles });
            await logAdminAction(currentUser, 'user.demote', userToDemote, { from: 'admin' });
            toast({ title: "Permissions Updated", description: `${userToDemote.displayName} is no longer an admin.` });
        } catch(error: any) {
            console.error("Error demoting user:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update user permissions." });
        } finally {
            setUserToDemote(null);
        }
    }, [userToDemote, toast, currentUser]);
    
    const handleToggleBlock = useCallback(async (user: UserProfile) => {
        if (!currentUser) return;
        const userRef = doc(db, 'users', user.id);
        const newBlockState = !user.isBlocked;
        try {
            await updateDoc(userRef, { isBlocked: newBlockState });
            await logAdminAction(currentUser, newBlockState ? 'user.block' : 'user.unblock', user);
            toast({ 
                title: `User ${newBlockState ? 'Blocked' : 'Unblocked'}`, 
                description: `${user.displayName} has been ${newBlockState ? 'blocked' : 'unblocked'}.`
            });
        } catch (error: any) {
            console.error("Error toggling user block state:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update user status." });
        }
    }, [toast, currentUser]);

    const handleDeleteUser = useCallback(async () => {
        if (!userToDelete || !currentUser) return;
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userToDelete.id);
        batch.delete(userRef);
        await batch.commit();
        await logAdminAction(currentUser, 'user.delete', userToDelete);
        toast({ title: "User Deleted", description: `${userToDelete.displayName} has been deleted.` });
        setUserToDelete(null);
    }, [userToDelete, toast, currentUser]);
    
    const handleClearHistory = useCallback(async () => {
        if (!db || !isSuperAdmin) return;
        try {
            const logsCollection = collection(db, 'auditLogs');
            const logsSnapshot = await getDocs(logsCollection);
            const batch = writeBatch(db);
            logsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            toast({ title: "History Cleared", description: "The audit log has been successfully cleared." });
        } catch (error) {
            console.error("Error clearing audit logs:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not clear the history." });
        } finally {
            setShowClearHistoryDialog(false);
        }
    }, [isSuperAdmin, toast]);

    const UserCard = React.memo(({ user }: { user: UserProfile }) => {
        const userIsSuperAdmin = isUserSuperAdmin(user);
        const userIsSubAdmin = isSubAdmin(user);
        const isCurrentUser = user.studentId === currentStudentId;
        const userLevel = user.level || studentIdToLevelMap.get(user.studentId);
        const joinDate = user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : null;

        const roleIcon = userIsSuperAdmin ? <Crown className="w-5 h-5 text-yellow-400" />
                       : userIsSubAdmin ? <Shield className="w-5 h-5 text-blue-400" />
                       : <User className="w-5 h-5 text-white" />;
        
        const mobileRoleIcon = userIsSuperAdmin ? <Crown className="w-3 h-3 text-yellow-400" />
                                : userIsSubAdmin ? <Shield className="w-3 h-3 text-blue-400" />
                                : <User className="w-3 h-3 text-white" />;

        const RoleText = () => (
            userIsSuperAdmin ? <span className='text-yellow-400'>Super Admin</span>
            : userIsSubAdmin ? <span className='text-blue-400'>Admin</span>
            : <span className='text-slate-300'>User</span>
        );
        
        return (
            <div 
                className={cn("p-4 flex items-center justify-between", user.isBlocked && "opacity-50")}
            >
                <div className="flex items-center gap-4 overflow-hidden">
                    <Avatar>
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{user.displayName?.[0] || user.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-semibold text-white truncate sm:text-base">{user.displayName || user.username} {isCurrentUser && '(You)'}</p>
                           {user.isBlocked && <span className="text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full">Blocked</span>}
                        </div>
                        {/* Mobile view */}
                        <div className="sm:hidden text-xs text-slate-400 space-y-0.5 mt-1">
                            <p className="truncate">{user.email}</p>
                            <p>ID: {user.studentId}</p>
                            <div className="flex items-center gap-4">
                                {userLevel && (
                                    <div className="flex items-center gap-1.5">
                                        <GraduationCap className="w-3 h-3 text-slate-300"/>
                                        <span className="text-slate-200 font-medium">{userLevel}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    {mobileRoleIcon}
                                    <RoleText />
                                </div>
                            </div>
                        </div>
                        {/* Desktop view */}
                        <div className="hidden sm:flex items-center text-sm text-slate-400">
                          <span className="truncate">{user.email}</span>
                          <span className="mx-2">•</span>
                          <span>ID: {user.studentId}</span>
                           {joinDate && (
                                <>
                                    <span className="mx-2">•</span>
                                    <span>Joined: {joinDate}</span>
                                </>
                           )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    {userLevel && (
                        <div className="hidden sm:flex items-center gap-2 text-sm">
                            <GraduationCap className="w-4 h-4 text-slate-300"/>
                            <span className="text-slate-200 font-medium">{userLevel}</span>
                        </div>
                    )}
                    <div className="hidden sm:flex items-center gap-2 text-sm">
                        {roleIcon}
                        <RoleText />
                    </div>
                   
                   {activeTab === 'management' && !userIsSuperAdmin && (
                        <div className="hidden sm:flex items-center gap-2">
                           {/* Button removed as requested */}
                        </div>
                    )}
                    {(activeTab === 'management' || (activeTab === 'admins' && userIsSubAdmin)) && !userIsSuperAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-400">
                                    <MoreVertical size={18} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-2">
                               {activeTab === 'admins' && userIsSubAdmin && (
                                    <DropdownMenuItem onClick={() => setUserForPermissions(user)}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Permissions
                                    </DropdownMenuItem>
                                )}
                                {activeTab === 'management' && (
                                     <>
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
                                     </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        );
    });
    UserCard.displayName = 'UserCard';

    const renderUserList = useCallback((userList: UserProfile[] | null) => {
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
        return userList.map((user) => (
             <div key={user.id} className="my-1.5 sm:my-0 border-b border-white/10 mx-2 sm:mx-0 last:border-b-0">
                <UserCard user={user} />
            </div>
        ));
    }, [loadingUsers, debouncedQuery, UserCard, activeTab]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
                <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
                        Admin Panel
                    </h1>
                </div>

                <div className="flex flex-row justify-between items-center mb-4 gap-4">
                     <div className="relative w-full sm:max-w-sm">
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
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                 <Button variant="outline" className="rounded-2xl w-auto">
                                    <ArrowUpDown className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Sort by</span>
                                </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent className="w-48 sm:w-56 p-2">
                                <DropdownMenuLabel>Sort Users By</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={sortOption} onValueChange={(v) => { setSortOption(v as SortOption); setLevelFilter(null); }}>
                                    <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="createdAt">Creation Date</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="level">Level</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Filter by Level</DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuRadioGroup value={levelFilter || ''} onValueChange={(v) => { setLevelFilter(v || null); setSortOption('name'); }}>
                                                <DropdownMenuRadioItem value="">All Levels</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Level 1">Level 1</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Level 2">Level 2</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Level 3">Level 3</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Level 4">Level 4</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Level 5">Level 5</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>
                         <Button onClick={() => setShowAddUserDialog(true)} className="rounded-2xl">
                           <UserPlus className="h-4 w-4 sm:mr-2"/>
                           <span className="hidden sm:inline">Add User</span>
                       </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col items-center">
                    <TabsList className={cn("grid w-full max-w-lg mx-auto bg-black/20 border-white/10 rounded-full p-1.5 h-12", isSuperAdmin ? "grid-cols-4" : "grid-cols-3")}>
                        <TabsTrigger value="users">
                            All Users 
                            {filteredAndSortedUsers && <span className="ml-2 bg-slate-700/80 text-slate-200 text-xs font-bold px-2 py-0.5 rounded-full">{filteredAndSortedUsers.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="admins">
                            Admins
                            {admins && <span className="ml-2 bg-slate-700/80 text-slate-200 text-xs font-bold px-2 py-0.5 rounded-full">{admins.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="management">Management</TabsTrigger>
                        {isSuperAdmin && <TabsTrigger value="audit">History</TabsTrigger>}
                    </TabsList>
                </Tabs>
            </div>
            
            <div className="flex-1 overflow-y-auto mt-6 no-scrollbar pr-2 -mr-2">
                <Tabs value={activeTab}>
                    <TabsContent value="users" className="space-y-0">
                        {renderUserList(filteredAndSortedUsers)}
                    </TabsContent>
                    <TabsContent value="admins" className="space-y-0">
                        {renderUserList(admins)}
                    </TabsContent>
                    <TabsContent value="management" className="space-y-0">
                        {renderUserList(filteredAndSortedUsers)}
                    </TabsContent>
                    {isSuperAdmin && (
                        <TabsContent value="audit">
                            <div className="flex justify-end mb-4">
                                <Button
                                  variant="destructive"
                                  onClick={() => setShowClearHistoryDialog(true)}
                                  disabled={!auditLogs || auditLogs.length === 0}
                                  className="rounded-2xl flex items-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Clear History
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {loadingLogs ? <p>Loading logs...</p> : 
                                 auditLogs && auditLogs.length > 0 ? (
                                    auditLogs.map(log => (
                                        <div key={log.id} className="text-sm p-3 rounded-lg bg-black/10 flex items-start gap-3">
                                            <History className="w-4 h-4 text-slate-400 mt-1 shrink-0"/>
                                            <div>
                                                <p className='text-slate-100'>
                                                   User <span className='font-mono text-amber-300'>{log.actorId}</span> performed action <span className='font-mono text-blue-300'>{log.action}</span> on user <span className='font-mono text-amber-300'>{log.targetId}</span>
                                                </p>
                                                <p className='text-xs text-slate-500 mt-0.5'>{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</p>
                                            </div>
                                        </div>
                                    ))
                                 ) : (
                                    <div className="text-center text-slate-400 py-16 flex flex-col items-center">
                                        <History className="w-12 h-12 text-slate-500 mb-4"/>
                                        <p className="font-semibold text-lg text-white">No History Yet</p>
                                        <p>Administrative actions will be logged here.</p>
                                    </div>
                                 )}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
            <AddUserDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog} />
            
            <PermissionsDialog 
                user={userForPermissions} 
                open={!!userForPermissions} 
                onOpenChange={(isOpen) => {if(!isOpen) setUserForPermissions(null)}}
            />
             <AlertDialog open={!!userToDelete} onOpenChange={(open) => {if(!open) setUserToDelete(null)}}>
                <AlertDialogContent className="w-[90vw] sm:w-full">
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
                <AlertDialogContent className="w-[90vw] sm:w-full">
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
            <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
                <AlertDialogContent className="w-[90vw] sm:w-full rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to clear the history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete all audit logs. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700">Clear History</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Lazy load the main component to prevent chunk load errors.
const AdminPageWithSuspense = () => (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
        <AdminPageContent />
    </Suspense>
);

export default AdminPageWithSuspense;
