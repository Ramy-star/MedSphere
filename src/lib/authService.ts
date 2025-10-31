
import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { format } from 'date-fns';


// --- (الإضافة 1) ---
// تعريف نوع للبيانات المستوردة من ملفات JSON
// هذا يحل أخطاء TS(7053) وأخطاء TS(2769) الأولى
type StudentData = {
  "Student ID": string | number;
  "Student Name": string;
  "Academic Email"?: string;
};
// --- نهاية الإضافة ---

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

const allStudentIds = new Set([
    // إضافة cast بسيط لضمان النوع
    ...(level1Ids as (string | number)[]).map(String),
    ...(level2Ids as (string | number)[]).map(String),
    ...(level3Ids as (string | number)[]).map(String),
    ...(level4Ids as (string | number)[]).map(String),
    ...(level5Ids as (string | number)[]).map(String),
]);

const allStudentData = new Map([
    // --- (التصحيح 1) ---
    // 1. تحديد نوع levelXData كـ StudentData[]
    // 2. استخدام "as const" لإخبار TypeScript أن هذه مصفوفة من عنصرين [key, value]
    ...(level1Data as StudentData[]).map(d => [String(d['Student ID']), d] as const),
    ...(level2Data as StudentData[]).map(d => [String(d['Student ID']), d] as const),
    ...(level3Data as StudentData[]).map(d => [String(d['Student ID']), d] as const),
    ...(level4Data as StudentData[]).map(d => [String(d['Student ID']), d] as const),
    ...(level5Data as StudentData[]).map(d => [String(d['Student ID']), d] as const),
]);

const idToLevelMap = new Map([
    // --- (التصحيح 2) ---
    // استخدام "as const" لإخبار TypeScript أن هذه مصفوفة من عنصرين [string, string]
    // هذا يحل خطأ "Target requires 2 element(s) but source may have fewer"
    ...level1Ids.map(id => [String(id), 'Level 1'] as const),
    ...level2Ids.map(id => [String(id), 'Level 2'] as const),
    ...level3Ids.map(id => [String(id), 'Level 3'] as const),
    ...level4Ids.map(id => [String(id), 'Level 4'] as const),
    ...level5Ids.map(id => [String(id), 'Level 5'] as const),
]);

export async function isSuperAdmin(studentId: string | null): Promise<boolean> {
    return !!studentId && studentId === SUPER_ADMIN_ID;
}

export async function isStudentIdValid(id: string): Promise<boolean> {
    const trimmedId = id.trim();

    console.log(`[AUTH] Validating Student ID: ${trimmedId}`);

    // First, check the static list. This is the fastest check.
    if (allStudentIds.has(trimmedId)) {
        console.log(`[AUTH] ✓ Student ID found in static lists`);
        return true;
    }

    console.log(`[AUTH] Student ID not in static lists, checking Firestore...`);

    // If not in the static list, check Firestore for an existing user.
    // This allows manually added users to log in.
    if (!db) {
        console.error("[AUTH] ✗ CRITICAL: Firestore not initialized");
        console.error("[AUTH] db value:", db);
        console.error("[AUTH] typeof db:", typeof db);
        return false;
    }

    try {
        const userDocRef = doc(db, 'users', trimmedId);
        console.log(`[AUTH] Checking Firestore: users/${trimmedId}`);
        const userDoc = await getDoc(userDocRef);
        const exists = userDoc.exists();

        if (exists) {
            console.log(`[AUTH] ✓ User found in Firestore`);
        } else {
            console.log(`[AUTH] ✗ User not found in Firestore`);
        }

        return exists;
    } catch (error: any) {
        console.error("[AUTH] ✗ Firestore error:", error);
        console.error("[AUTH] Error code:", error.code);
        console.error("[AUTH] Error message:", error.message);
        return false;
    }
}

export async function getUserProfile(studentId: string): Promise<any | null> {
    console.log(`[AUTH] Getting user profile for: ${studentId}`);

    if (!db) {
        console.error("[AUTH] ✗ Firestore not initialized in getUserProfile");
        return null;
    }

    try {
        const userDocRef = doc(db, 'users', studentId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            console.log(`[AUTH] ✓ Profile found for ${studentId}`);
            return { id: userDoc.id, ...userDoc.data() };
        }

        console.log(`[AUTH] ✗ No profile found for ${studentId}`);
        return null;
    } catch (error: any) {
        console.error(`[AUTH] ✗ Error getting profile:`, error);
        console.error(`[AUTH] Error code:`, error.code);
        return null;
    }
}

export async function verifyAndCreateUser(studentId: string): Promise<{ userProfile: any | null, isNewUser: boolean }> {
    const trimmedId = studentId.trim();

    if (!(await isStudentIdValid(trimmedId))) {
        console.log(`Verification failed: Student ID "${trimmedId}" not found in valid lists or database.`);
        return { userProfile: null, isNewUser: false };
    }

    if (!db) {
        console.error("Firestore not initialized in authService.verifyAndCreateUser");
        throw new Error("Database service is not available.");
    }
    
    try {
        let userProfile = await getUserProfile(trimmedId);
        let isNewUser = false;

        if (userProfile) {
            console.log(`User found in Firestore for ID: ${trimmedId}`);
        } else {
            isNewUser = true;
            console.log(`User not found for ID: ${trimmedId}. Creating new profile.`);
            
            const studentData = allStudentData.get(trimmedId);
            const userLevel = idToLevelMap.get(trimmedId);
            const isUserSuperAdmin = await isSuperAdmin(trimmedId);
            
            const newUserDocRef = doc(db, 'users', trimmedId);
            
            userProfile = {
                id: trimmedId,
                uid: trimmedId, 
                studentId: trimmedId,
                displayName: studentData?.['Student Name'] || `Student ${trimmedId}`,
                username: `student_${trimmedId}`,
                email: studentData?.['Academic Email'] || '',
                level: userLevel || 'Unknown',
                createdAt: new Date().toISOString(),
                roles: isUserSuperAdmin ? [{ role: 'superAdmin', scope: 'global' }] : [],
                stats: {
                    filesUploaded: 0,
                    foldersCreated: 0,
                    examsCompleted: 0,
                    aiQueries: 0,
                    consecutiveLoginDays: 1,
                    lastLoginDate: format(new Date(), 'yyyy-MM-dd'),
                },
                achievements: [],
                sessions: [],
                favorites: [],
            };
            
            await setDoc(newUserDocRef, userProfile);
            console.log(`New user profile created for ID: ${trimmedId}`);
        }
        
        return { userProfile, isNewUser };

    } catch (error) {
        console.error("Error during user verification and creation:", error);
        return { userProfile: null, isNewUser: false };
    }
}
