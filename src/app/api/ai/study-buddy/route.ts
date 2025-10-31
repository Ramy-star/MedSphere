/**
 * API Route: Study Buddy Initial Insight
 * Generates personalized study insights based on user's study data
 *
 * This endpoint analyzes the user's lectures, question sets, and study sessions
 * to provide AI-generated study recommendations and insights.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudyBuddyInsight } from '@/ai/flows/study-buddy-flow';

// Configure runtime and timeout
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds for insight generation

/**
 * POST /api/ai/study-buddy
 *
 * Request Body:
 * {
 *   displayName?: string,
 *   username: string,
 *   filesUploaded?: number,
 *   foldersCreated?: number,
 *   examsCompleted?: number,
 *   aiQueries?: number,
 *   favoritesCount?: number,
 *   greeting: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   result: {
 *     greeting: string,
 *     mainInsight: string,
 *     suggestedActions: Array<{label: string, prompt: string}>
 *   }
 * }
 * OR
 * {
 *   success: false,
 *   error: string,
 *   errorType: string
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[${requestId}] Study buddy insight request received`);
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { displayName, username, filesUploaded, foldersCreated, examsCompleted, aiQueries, favoritesCount, greeting } = body;

    // Validate required fields
    if (!username || typeof username !== 'string') {
      console.error(`[${requestId}] Validation failed: username is required`);
      return NextResponse.json(
        {
          success: false,
          error: 'Username is required and must be a string',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    if (!greeting || typeof greeting !== 'string') {
      console.error(`[${requestId}] Validation failed: greeting is required`);
      return NextResponse.json(
        {
          success: false,
          error: 'Greeting is required and must be a string',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Generating insight for user: ${username}`);
    console.log(`[${requestId}] Stats: files=${filesUploaded || 0}, folders=${foldersCreated || 0}, exams=${examsCompleted || 0}`);

    // Call the AI flow with user stats
    const result = await getStudyBuddyInsight({
      displayName,
      username,
      filesUploaded: filesUploaded || 0,
      foldersCreated: foldersCreated || 0,
      examsCompleted: examsCompleted || 0,
      aiQueries: aiQueries || 0,
      favoritesCount: favoritesCount || 0,
      greeting,
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Insight generated successfully in ${duration}ms`);

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${duration}ms:`, error);

    // Categorize error types
    let errorType = 'unknown';
    let statusCode = 500;
    let errorMessage = error.message || 'An unexpected error occurred';

    if (errorMessage.includes('API key')) {
      errorType = 'api_key';
      errorMessage = 'AI API key is missing or invalid. Please check your environment configuration.';
      statusCode = 500;
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      errorType = 'quota';
      errorMessage = 'AI service quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      errorType = 'timeout';
      errorMessage = 'AI request timed out. Please try again.';
      statusCode = 504;
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = 'network';
      errorMessage = 'Network error occurred. Please check your connection and try again.';
      statusCode = 503;
    }

    console.error(`[${requestId}] Categorized as ${errorType} error with status ${statusCode}`);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorType,
      },
      { status: statusCode }
    );
  }
}
