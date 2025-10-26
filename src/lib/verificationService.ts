
'use server';

import level1 from './student-ids/level-1.json';
import level2 from './student-ids/level-2.json';
import level3 from './student-ids/level-3.json';
import level4 from './student-ids/level-4.json';
import level5 from './student-ids/level-5.json';
import { db } from '@/firebase'; // Assuming db is exported from a central firebase setup
import { doc, getDoc } from 'firebase/firestore';


// Combine all student IDs into a single set for efficient lookup
const allStudentIds = new Set([
    ...level1,
    ...level2,
    ...level3,
    ...level4,
    ...level5,
]);

/**
 * Verifies if a given student ID is valid and not already claimed.
 * @param id The student ID to verify.
 * @returns A promise that resolves to true if the ID is valid and available, false otherwise.
 */
export async function verifyStudentId(id: string): Promise<boolean> {
    const trimmedId = id.trim();
    
    // 1. Check if the ID exists in the predefined lists
    if (!allStudentIds.has(trimmedId)) {
        return false;
    }

    // 2. Check if the ID has already been claimed in Firestore
    if (!db) {
        // This case should ideally not happen on the server if db is initialized correctly.
        // It might happen during local dev if firebase isn't set up.
        console.error("Firestore DB instance is not available for student ID verification.");
        // As a fallback, we might allow it but this is not ideal.
        // For security, it's better to fail closed.
        return false;
    }
    
    try {
        const docRef = doc(db, 'claimedStudentIds', trimmedId);
        const docSnap = await getDoc(docRef);
        
        // If the document exists, it means the ID is already claimed.
        if (docSnap.exists()) {
            return false;
        }

    } catch (error) {
        console.error("Error checking claimed student ID in Firestore:", error);
        // Fail closed for security. If we can't check the DB, don't allow verification.
        return false;
    }

    // If it's in the list and not claimed, it's valid.
    return true;
}
