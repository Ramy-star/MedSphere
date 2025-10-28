
'use client';

import React, { useState, useEffect } from 'react';
import type { UserProfile, UserSession } from '@/stores/auth-store';
import { useAuthStore } from '@/stores/auth-store';
import { Monitor, Smartphone, Tablet, LogOut, Laptop, Ban } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
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

const getDeviceIcon = (device: string | undefined) => {
    if (!device) return <Monitor className="w-5 h-5 text-slate-400" />;
    const lowerDevice = device.toLowerCase();
    if (lowerDevice.includes('iphone') || lowerDevice.includes('android')) return <Smartphone className="w-5 h-5 text-slate-400" />;
    if (lowerDevice.includes('ipad') || lowerDevice.includes('tablet')) return <Tablet className="w-5 h-5 text-slate-400" />;
    if (lowerDevice.includes('mac') || lowerDevice.includes('windows') || lowerDevice.includes('linux')) return <Laptop className="w-5 h-5 text-slate-400" />;
    return <Monitor className="w-5 h-5 text-slate-400" />;
};

const TimeAgo = ({ dateString }: { dateString: string }) => {
    const [timeAgo, setTimeAgo] = useState(() => formatDistanceToNow(parseISO(dateString), { addSuffix: true }));

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeAgo(formatDistanceToNow(parseISO(dateString), { addSuffix: true }));
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [dateString]);

    return <span>{timeAgo}</span>;
};


export const ActiveSessions = ({ user }: { user: UserProfile }) => {
    const { logoutSession, currentSessionId } = useAuthStore();
    const [sessionToLogout, setSessionToLogout] = useState<string | null>(null);

    const sessions = user.sessions?.filter(s => s.status !== 'logged_out') || [];
    
    if (sessions.length === 0) {
        return null;
    }
    
    const sortedSessions = [...sessions].sort((a, b) => {
        if (a.sessionId === currentSessionId) return -1;
        if (b.sessionId === currentSessionId) return 1;
        return parseISO(b.lastActive).getTime() - parseISO(a.lastActive).getTime();
    });

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">Active Sessions</h2>
            <div className="space-y-3">
                {sortedSessions.map((session) => {
                    const isCurrent = session.sessionId === currentSessionId;
                    return (
                        <div key={session.sessionId} className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl">
                           <div className="flex items-center gap-4">
                                {getDeviceIcon(session.device)}
                                <div>
                                    <p className="font-medium text-white flex items-center gap-2">
                                        {session.device || 'Unknown Device'}
                                        {isCurrent && <span className="text-xs font-bold text-green-400 bg-green-900/50 px-2 py-0.5 rounded-full">Current</span>}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        <span>Last active <TimeAgo dateString={session.lastActive} /></span>
                                    </p>
                                </div>
                           </div>
                           {!isCurrent && (
                                <div className="flex items-center gap-2 sm:ml-auto">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button className="expanding-btn warning">
                                                <Ban size={20} />
                                                <span className="expanding-text">Block</span>
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Block this device?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Blocking a device is a future feature. This action will log out the session for now. Are you sure you want to proceed?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => logoutSession(session.sessionId)} className="bg-yellow-600 hover:bg-yellow-700">Confirm Logout</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button className="expanding-btn destructive">
                                                <LogOut size={20} />
                                                <span className="expanding-text">Logout</span>
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will log out the session on "{session.device}". You will need to sign in again on that device.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => logoutSession(session.sessionId)} className="bg-red-600 hover:bg-red-700">
                                                    Log out
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                           )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
