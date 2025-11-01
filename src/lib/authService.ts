'use client';

import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where, runTransaction } from 'firebase/firestore';
import { format } from 'date-fns';

import level1Ids from '@/lib/student-ids/level-1.json';
import level2Ids from '@/lib/student-ids/level-2.json';
import level3Ids from '@/lib/student-ids/level-3.json';
import level4Ids from '@/lib/student-ids/level-4.json';
import level5Ids from '@/lib/student-ids/level-5.json';

import level1Data from '@/lib/student-ids/level-1-data.json';
import level2Data from '@/lib/student-ids/level-2-data.json';
import level3Data from '@/lib/student-ids/level-3-data.json';
import level4Data from '@/lib/student-ids/level-4-data.json';
import level5Data from '@/lib/student-ids/level-5-data.json';

const SUPER_ADMIN_ID = "221100154";

// --- Hashing functions using Web Crypto API ---
// These functions will only run in the client, where crypto.subtle is available.

async function hashSecretCode(secretCode: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        throw new Error("Crypto API not available.");
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(secretCode);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function compareSecretCode(secretCode: string, hash: string): Promise<boolean> {
    const newHash = await hashSecretCode(secretCode);
    return newHash === hash;
}


const allStudentIds = new Set([
    ...level1Ids,
    ...level2Ids,
    ...level3Ids,
    ...level4Ids,
    ...level5Ids,
].map(String));

const allStudentData = new Map([
    ...(level1Data as any[]).map(d => [String(d['Student ID']), d]),
    ...(level2Data as any[]).map(d => [String(d['Student ID']), d]),
    ...(level3Data as any[]).map(d => [String(d['Student ID']), d]),
    ...(level4Data as any[]).map(d => [String(d['Student ID']), d]),
    ...(level5Data as any[]).map(d => [String(d['Student ID']), d]),
]);

const idToLevelMap = new Map([
    ...level1Ids.map(id => [String(id), 'Level 1']),
    ...level2Ids.map(id => [String(id), 'Level 2']),
    ...level3Ids.map(id => [String(id), 'Level 3']),
    ...level4Ids.map(id => [String(id), 'Level 4']),
    ...level5Ids.map(id => [String(id), 'Level 5']),
]);

export async function getStudentDetails(studentId: string): Promise<{ isValid: boolean, isClaimed: boolean, userProfile: any | null }> {
    const trimmedId = studentId.trim();
    if (!allStudentIds.has(trimmedId)) {
        return { isValid: false, isClaimed: false, userProfile: null };
    }

    if (!db) {
        throw new Error("Could not connect to the database to verify student ID.");
    }

    try {
        const userDocRef = doc(db, 'users', trimmedId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return { isValid: true, isClaimed: true, userProfile: { id: userDoc.id, ...userDoc.data() } };
        }
        
        return { isValid: true, isClaimed: false, userProfile: null };

    } catch (error) {
        console.error("Error checking student details:", error);
        throw new Error("Could not connect to the database to verify student ID.");
    }
}


export async function verifySecretCode(studentId: string, secretCode: string): Promise<any | null> {
    if (!db) throw new Error("Database not available.");
    const userDocRef = doc(db, 'users', studentId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        return null;
    }

    const userProfile = userDoc.data();
    if (!userProfile.secretCodeHash) {
        return null;
    }
    
    const isMatch = await compareSecretCode(secretCode, userProfile.secretCodeHash);
    
    if (isMatch) {
        return { id: userDoc.id, ...userProfile };
    }

    return null;
}

export async function createUserProfile(studentId: string, secretCode: string): Promise<any> {
    const trimmedId = studentId.trim();

    if (!db) throw new Error("Database service is not available.");

    return runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'users', trimmedId);
        const userDoc = await transaction.get(userDocRef);

        if (userDoc.exists()) {
            throw new Error("This Student ID has already been registered.");
        }

        const studentData = allStudentData.get(trimmedId);
        const userLevel = idToLevelMap.get(trimmedId);
        const isUserSuperAdmin = trimmedId === SUPER_ADMIN_ID;

        const secretCodeHash = await hashSecretCode(secretCode);

        const newUserProfile = {
            id: trimmedId,
            uid: trimmedId, 
            studentId: trimmedId,
            displayName: studentData?.['Student Name'] || `Student ${trimmedId}`,
            username: `student_${trimmedId}`,
            email: studentData?.['Academic Email'] || '',
            level: userLevel || 'Unknown',
            createdAt: new Date().toISOString(),
            roles: isUserSuperAdmin ? [{ role: 'superAdmin', scope: 'global' }] : [],
            secretCodeHash,
            stats: {
                filesUploaded: 0,
                foldersCreated: 0,
                examsCompleted: 0,
                aiQueries: 0,
                consecutiveLoginDays: 1,
                lastLoginDate: format(new Date(), 'yyyy-MM-dd'),
            },
            achievements: [{ badgeId: 'FIRST_LOGIN', earnedAt: new Date().toISOString() }],
            sessions: [],
            favorites: [],
            metadata: {},
        };

        transaction.set(userDocRef, newUserProfile);

        return newUserProfile;
    });
}
