
'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';
import { lecturesData } from '@/lib/data';

const ExamContainer = dynamic(() => import('@/components/ExamContainer'), {
    loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>,
    ssr: false
});

// --- MAIN APP COMPONENT ---
export default function ExamPage() {
    const { isAuthenticated, loading } = useAuthStore();

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    // Only render the exam container if a user is logged in.
    if (!isAuthenticated) {
        return <div className="flex items-center justify-center h-screen"><p>Please verify your student ID to continue.</p></div>;
    }

    return (
        <ExamContainer lectures={lecturesData} fileItemId={null} />
    );
}
