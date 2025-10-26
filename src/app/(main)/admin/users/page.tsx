
'use client';

import { useUser, type UserProfile } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, ShieldCheck, Search, UsersCog, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';
import { motion } from 'framer-motion';

function UserManagementPage() {
    const { user, loading: userLoading, isSuperAdmin } = useUser();
    const router = useRouter();

    const { data: allUsers, loading: usersLoading } = useCollection<UserProfile>('users', {
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
                    <UsersCog className="w-8 h-8 text-cyan-400" />
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
                        {filteredUsers && filteredUsers.map((u) => (
                            <motion.div
                                key={u.uid}
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0 },
                                }}
                                className="glass-card p-4 rounded-2xl flex items-center justify-between hover:bg-slate-800/60 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
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
                                    {u.roles?.isSuperAdmin && (
                                        <div className="flex items-center gap-1 text-yellow-400 text-sm font-semibold p-2 bg-yellow-400/10 rounded-lg">
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>Super Admin</span>
                                        </div>
                                    )}
                                    {/* Buttons for actions will go here */}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default UserManagementPage;
