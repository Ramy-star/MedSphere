
import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

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
    ...level1Ids,
    ...level2Ids,
    ...level3Ids,
    ...level4Ids,
    ...level5Ids,
]);

const allStudentData = new Map([
    ...level1Data.map(d => [String(d['Student ID']), d]),
    ...level2Data.map(d => [String(d['Student ID']), d]),
    ...level3Data.map(d => [String(d['Student ID']), d]),
    ...level4Data.map(d => [String(d['Student ID']), d]),
    ...level5Data.map(d => [String(d['Student ID']), d]),
]);

const idToLevelMap = new Map([
  ...level1Ids.map(id => [String(id), 'Level 1']),
  ...level2Ids.map(id => [String(id), 'Level 2']),
  ...level3Ids.map(id => [String(id), 'Level 3']),
  ...level4Ids.map(id => [String(id), 'Level 4']),
  ...level5Ids.map(id => [String(id), 'Level 5']),
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
        const studentData = allStudentData.get(trimmedId);
        const userLevel = idToLevelMap.get(trimmedId);
        const isUserSuperAdmin = await isSuperAdmin(trimmedId);
        
        const newUserDocRef = doc(db, 'users', trimmedId);
        
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
        };
        
        await setDoc(newUserDocRef, newUserProfile);
        console.log(`New user profile created for ID: ${trimmedId}`);

        return newUserProfile;

    } catch (error) {
        console.error("Error during user verification and creation:", error);
        return null;
    }
}

    