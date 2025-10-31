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
 *   lectures: Array<Lecture>,
 *   questionSets: Array<QuestionSet>,
 *   studySessions: Array<StudySession>
 * }
 *
 * Response:
 * {
 *   success: true,
 *   insight: string (AI-generated insight)
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
    const { lectures, questionSets, studySessions } = body;

    // Validate required fields
    if (!lectures || !Array.isArray(lectures)) {
      console.error(`[${requestId}] Validation failed: lectures must be an array`);
      return NextResponse.json(
        {
          success: false,
          error: 'Lectures data is required and must be an array',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    if (!questionSets || !Array.isArray(questionSets)) {
      console.error(`[${requestId}] Validation failed: questionSets must be an array`);
      return NextResponse.json(
        {
          success: false,
          error: 'Question sets data is required and must be an array',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    if (!studySessions || !Array.isArray(studySessions)) {
      console.error(`[${requestId}] Validation failed: studySessions must be an array`);
      return NextResponse.json(
        {
          success: false,
          error: 'Study sessions data is required and must be an array',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Generating insight for:`);
    console.log(`[${requestId}] - ${lectures.length} lectures`);
    console.log(`[${requestId}] - ${questionSets.length} question sets`);
    console.log(`[${requestId}] - ${studySessions.length} study sessions`);

    // Call the AI flow
    const insight = await getStudyBuddyInsight({
      lectures,
      questionSets,
      studySessions,
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Insight generated successfully in ${duration}ms`);
    console.log(`[${requestId}] Insight length: ${insight.length} chars`);

    return NextResponse.json({
      success: true,
      insight,
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
