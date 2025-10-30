import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

// --- (الإضافة 1) ---
// تعريف نوع للبيانات المستوردة من ملفات JSON
// هذا يحل أخطاء TS(7053) وأخطاء TS(2769) الأولى
type StudentData = {
  "Student ID": string | number;
  "Student Name": string;
  "Academic Email"?: string;
};
// --- نهاية الإضافة ---

import level1Ids from './student-ids/level-1.json';
import level2Ids from './student-ids/level-2.json';
import level3Ids from './student-ids/level-3.json';
import level4Ids from './student-ids/level-4.json';
import level5Ids from './student-ids/level-5.json';

import level1Data from './student-ids/level-1-data.json';
import level2Data from './student-ids/level-2-data.json';
import level3Data from './student-ids/level-3-data.json';
import level4Data from './student-ids/level-4-data.json';
import level5Data from './student-ids/level-5-data.json';

const SUPER_ADMIN_ID = "221100154";

const allStudentIds = new Set([
    // إضافة cast بسيط لضمان النوع
    ...(level1Ids as (string | number)[]),
    ...(level2Ids as (string | number)[]),
    ...(level3Ids as (string | number)[]),
    ...(level4Ids as (string | number)[]),
    ...(level5Ids as (string | number)[]),
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
    return allStudentIds.has(id.trim());
}

export async function getUserProfile(studentId: string): Promise<any | null> {
    if (!db) {
        console.error("Firestore not initialized in authService.getUserProfile");
        return null;
    }
    const userDocRef = doc(db, 'users', studentId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
}

export async function verifyAndCreateUser(studentId: string): Promise<any | null> {
    const trimmedId = studentId.trim();

    if (!(await isStudentIdValid(trimmedId))) {
        console.log(`Verification failed: Student ID "${trimmedId}" not found in valid lists.`);
        return null;
    }

    if (!db) {
        console.error("Firestore not initialized in authService.verifyAndCreateUser");
        throw new Error("Database service is not available.");
    }
    
    try {
        let userProfile = await getUserProfile(trimmedId);

        if (userProfile) {
            console.log(`User found in Firestore for ID: ${trimmedId}`);
            return userProfile;
        }

        console.log(`User not found for ID: ${trimmedId}. Creating new profile.`);
        
        // الآن "studentData" سيتم استنتاج نوعه كـ "StudentData | undefined"
        const studentData = allStudentData.get(trimmedId);
        const userLevel = idToLevelMap.get(trimmedId);
        const isUserSuperAdmin = await isSuperAdmin(trimmedId);
        
        const newUserDocRef = doc(db, 'users', trimmedId);
        
        const newUserProfile = {
            id: trimmedId,
            uid: trimmedId, 
            studentId: trimmedId,
            // (تم حل الخطأ هنا)
            displayName: studentData?.['Student Name'] || `Student ${trimmedId}`,
            username: `student_${trimmedId}`,
            // (تم حل الخطأ هنا)
            email: studentData?.['Academic Email'] || '',
            level: userLevel || 'Unknown',
            createdAt: new Date().toISOString(),
            roles: isUserSuperAdmin ? [{ role: 'superAdmin', scope: 'global' }] : [],
        };
        
        await setDoc(newUserDocRef, newUserProfile);
        console.log(`New user profile created for ID: ${trimmedId}`);

        return newUserProfile;

    } catch (error) {
        console.error("Error during user verification and creation:", error);
        return null;
    }
}