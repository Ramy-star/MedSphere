
'use client';
import React from 'react';
import { lecturesData } from '@/lib/data';
import ExamContainer from '@/components/ExamContainer';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

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
