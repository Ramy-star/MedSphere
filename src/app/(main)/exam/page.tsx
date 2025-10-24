
'use client';
import React from 'react';
import { lecturesData } from '@/lib/data';
import { GitGrindExam } from '@/components/GitGrindExam';
import { useUser } from '@/firebase/auth/use-user';
import { Loader2 } from 'lucide-react';

// --- MAIN APP COMPONENT ---
export default function ExamPage() {
    const { user, loading } = useUser();

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    // Only render the exam container if a user is logged in.
    if (!user) {
        return <div className="flex items-center justify-center h-screen"><p>Please log in to continue.</p></div>;
    }

    return (
        <GitGrindExam lectures={lecturesData} />
    );
}
