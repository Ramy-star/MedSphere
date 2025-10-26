
'use server';

import level1 from './student-ids/level-1.json';
import level2 from './student-ids/level-2.json';
import level3 from './student-ids/level-3.json';
import level4 from './student-ids/level-4.json';
import level5 from './student-ids/level-5.json';

// Combine all student IDs into a single set for efficient lookup
const allStudentIds = new Set([
    ...level1,
    ...level2,
    ...level3,
    ...level4,
    ...level5,
]);

/**
 * Verifies if a given student ID is valid.
 * @param id The student ID to verify.
 * @returns A promise that resolves to true if the ID is valid, false otherwise.
 */
export async function verifyStudentId(id: string): Promise<boolean> {
    // The check is synchronous, but we keep it async for future-proofing (e.g., fetching from a DB).
    return allStudentIds.has(id.trim());
}
