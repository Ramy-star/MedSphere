
'use client';

import { Suspense, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, Trash2, UserPlus, Crown, Shield, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { useCollection } from '@/firebase/firestore/use-collection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';

type UserProfile = {
    uid: string;
    username: string;
    studentId: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    roles?: { role: 'superAdmin' | 'subAdmin', scope?: string, scopeId?: string, permissions?: string[] }[];
};

function AdminPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'users';

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery] = useDebounce(searchQuery, 300);

    const { data: users, loading: loadingUsers } = useCollection<UserProfile>('users');
    const { studentId: currentStudentId } = useAuthStore();

    const handleTabChange = (value: string) => {
        router.push(`/admin?tab=${value}`, { scroll: false });
    };

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!debouncedQuery) return users;
        const lowercasedQuery = debouncedQuery.toLowerCase();
        return users.filter(user => 
            user.displayName?.toLowerCase().includes(lowercasedQuery) ||
            user.username?.toLowerCase().includes(lowercasedQuery) ||
            user.email?.toLowerCase().includes(lowercasedQuery) ||
            user.studentId?.includes(lowercasedQuery)
        );
    }, [users, debouncedQuery]);

    const subAdmins = useMemo(() => {
        return filteredUsers.filter(user => user.roles?.some(r => r.role === 'subAdmin' || r.role === 'superAdmin'));
    }, [filteredUsers]);


    const UserCard = ({ user }: { user: UserProfile }) => {
        const isSuperAdmin = user.roles?.some(r => r.role === 'superAdmin');
        const isSubAdmin = user.roles?.some(r => r.role === 'subAdmin');
        const isCurrentUser = user.studentId === currentStudentId;

        const roleIcon = isSuperAdmin ? <Crown className="w-5 h-5 text-yellow-400" /> 
                       : isSubAdmin ? <Shield className="w-5 h-5 text-blue-400" />
                       : <User className="w-5 h-5 text-slate-400" />;

        const roleText = isSuperAdmin ? 'Super Admin'
                       : isSubAdmin ? 'Sub-Admin'
                       : 'User';
        
        return (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-2xl flex items-center justify-between"
            >
                <div className="flex items-center gap-4 overflow-hidden">
                    <Avatar>
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{user.displayName?.[0] || user.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <p className="font-semibold text-white truncate">{user.displayName || user.username} {isCurrentUser && '(You)'}</p>
                        <p className="text-sm text-slate-400 truncate">{user.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300">
                        {roleIcon}
                        <span>{roleText}</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
                                <MoreVertical size={18} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>
                                {isSubAdmin ? 'Edit Permissions' : 'Promote to sub-admin'}
                            </DropdownMenuItem>
                             {isSubAdmin && !isSuperAdmin && (
                                <DropdownMenuItem className="text-red-400">
                                    Remove sub-admin
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </motion.div>
        )
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input 
                            placeholder="Search by name, email, or ID..."
                            className="pl-10 bg-black/20 border-white/10 rounded-full h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button className="rounded-full h-10">
                        <UserPlus className="mr-2 h-4 w-4"/>
                        Add User
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col items-center">
                    <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-black/20 border-white/10 rounded-full p-1.5 h-12">
                        <TabsTrigger value="users">All Users</TabsTrigger>
                        <TabsTrigger value="sub-admins">Sub-Admins</TabsTrigger>
                        <TabsTrigger value="account-management">Management</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            
            <div className="flex-1 overflow-y-auto mt-6 no-scrollbar pr-2 -mr-2">
                <Tabs value={activeTab}>
                    <TabsContent value="users" className="space-y-4">
                        {filteredUsers.map(user => <UserCard key={user.uid} user={user} />)}
                    </TabsContent>
                    <TabsContent value="sub-admins" className="space-y-4">
                        {subAdmins.map(user => <UserCard key={user.uid} user={user} />)}
                    </TabsContent>
                    <TabsContent value="account-management">
                        <div className="text-center text-slate-400 py-16">
                            <p>Account management features will be available here.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
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
