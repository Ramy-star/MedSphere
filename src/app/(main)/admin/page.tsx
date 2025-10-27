
'use client';

import { Suspense, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, Trash2, UserPlus, Crown, Shield, User, SearchX, Settings, Ban } from 'lucide-react';
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
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { AddUserDialog } from '@/components/AddUserDialog';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PermissionsDialog } from '@/components/PermissionsDialog';


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

    const { data: users, loading: loadingUsers } = useCollection<UserProfile>('users');
    const { studentId: currentStudentId } = useAuthStore();
    const { toast } = useToast();

    const handleTabChange = (value: string) => {
        router.push(`/admin?tab=${value}`, { scroll: false });
    };

    const sortedUsers = useMemo(() => {
        if (!users) return [];
        return [...users].sort((a, b) => (a.displayName || a.username || '').localeCompare(b.displayName || b.username || ''));
    }, [users]);


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

    const isSuperAdmin = (user: UserProfile) => Array.isArray(user.roles) && user.roles.some(r => r.role === 'superAdmin');
    const isSubAdmin = (user: UserProfile) => Array.isArray(user.roles) && user.roles.some(r => r.role === 'subAdmin');

    const admins = useMemo(() => {
        return filteredUsers.filter(user => Array.isArray(user.roles) && user.roles.some(r => r.role === 'subAdmin' || r.role === 'superAdmin'));
    }, [filteredUsers]);
    
    const handleToggleSubAdmin = async (user: UserProfile) => {
        const userRef = doc(db, 'users', user.uid);
        const hasSubAdminRole = Array.isArray(user.roles) && user.roles.some(r => r.role === 'subAdmin');

        try {
            if (hasSubAdminRole) {
                // This will remove all subAdmin roles, which is fine for now as we don't distinguish them yet.
                const newRoles = user.roles?.filter(r => r.role !== 'subAdmin') || [];
                await updateDoc(userRef, { roles: newRoles });
                toast({ title: "Permissions Updated", description: `${user.displayName} is no longer an admin.` });
            } else {
                // Add a basic subAdmin role. Detailed permissions can be added later.
                const newSubAdminRole: UserRole = { role: 'subAdmin', scope: 'global' };
                await updateDoc(userRef, {
                    roles: arrayUnion(newSubAdminRole)
                });
                toast({ title: "Permissions Updated", description: `${user.displayName} is now an admin.` });
            }
        } catch (error: any) {
            console.error("Error updating user role:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update user permissions." });
        }
    };


    const UserCard = ({ user, isManagementView = false }: { user: UserProfile, isManagementView?: boolean }) => {
        const isUserSuperAdmin = isSuperAdmin(user);
        const isUserSubAdmin = isSubAdmin(user);
        const isCurrentUser = user.studentId === currentStudentId;

        const roleIcon = isUserSuperAdmin ? <Crown className="w-5 h-5 text-yellow-400" /> 
                       : isUserSubAdmin ? <Shield className="w-5 h-5 text-blue-400" />
                       : <User className="w-5 h-5 text-slate-400" />;

        const roleText = isUserSuperAdmin ? 'Super Admin'
                       : isUserSubAdmin ? 'Admin'
                       : 'User';
        
        return (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("glass-card p-4 rounded-2xl flex items-center justify-between", user.isBlocked && "opacity-50 bg-red-900/20")}
            >
                <div className="flex items-center gap-4 overflow-hidden">
                    <Avatar>
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{user.displayName?.[0] || user.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <p className="font-semibold text-white truncate">{user.displayName || user.username} {isCurrentUser && '(You)'}</p>
                        <p className="text-sm text-slate-400 truncate">{user.email} &bull; ID: {user.studentId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300">
                        {roleIcon}
                        <span>{roleText}</span>
                    </div>
                     {isManagementView && !isCurrentUser && !isUserSuperAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
                                    <MoreVertical size={18} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleToggleSubAdmin(user)}>
                                    {isUserSubAdmin ? 'Remove admin' : 'Promote to admin'}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Ban className="mr-2 h-4 w-4" /> Block User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-400">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {!isManagementView && isUserSubAdmin && !isUserSuperAdmin && (
                         <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setUserForPermissions(user)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Permissions
                        </Button>
                    )}
                </div>
            </motion.div>
        )
    };

    const renderUserList = (userList: UserProfile[], isManagementView = false) => {
        if (loadingUsers) return null;
        if (userList.length === 0 && debouncedQuery) {
            return (
                <div className="text-center text-slate-400 py-16 flex flex-col items-center">
                    <SearchX className="w-12 h-12 text-slate-500 mb-4"/>
                    <p className="font-semibold text-lg text-white">No Users Found</p>
                    <p>Your search for "{debouncedQuery}" did not return any results.</p>
                </div>
            )
        }
        return userList.map(user => <UserCard key={user.uid} user={user} isManagementView={isManagementView} />);
    };

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
                            isSearchFocused && "transform scale-110"
                        )} />
                        <Input 
                            placeholder="Search by name, email, or ID..."
                            className="pl-10 bg-black/20 border-white/10 rounded-2xl h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                    </div>
                     <Button onClick={() => setShowAddUserDialog(true)} className="rounded-2xl">
                       <UserPlus className="mr-2 h-4 w-4"/>
                       Add User
                   </Button>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col items-center">
                    <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-black/20 border-white/10 rounded-full p-1.5 h-12">
                        <TabsTrigger value="users">All Users</TabsTrigger>
                        <TabsTrigger value="admins">Admins</TabsTrigger>
                        <TabsTrigger value="management">Management</TabsTrigger>
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
            {userForPermissions && (
                <PermissionsDialog 
                    user={userForPermissions} 
                    open={!!userForPermissions} 
                    onOpenChange={(isOpen) => !isOpen && setUserForPermissions(null)}
                />
            )}
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
