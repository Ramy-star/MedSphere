/**
 * API Route: Study Buddy Chat
 * Handles conversational queries with the AI study buddy
 *
 * This endpoint processes user questions in the context of their study data
 * and provides personalized, contextual responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { answerStudyBuddyQuery } from '@/ai/flows/study-buddy-chat-flow';

// Configure runtime and timeout
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for chat processing

/**
 * POST /api/ai/study-buddy-chat
 *
 * Request Body:
 * {
 *   query: string,
 *   lectures: Array<Lecture>,
 *   questionSets: Array<QuestionSet>,
 *   studySessions: Array<StudySession>,
 *   conversationHistory: Array<{role: string, parts: Array<{text: string}>}>
 * }
 *
 * Response:
 * {
 *   success: true,
 *   answer: string (AI response)
 * }
 * OR
 * {
 *   success: false,
 *   error: string,
 *   errorType: string
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = `buddy-chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[${requestId}] Study buddy chat request received`);
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { query, lectures, questionSets, studySessions, conversationHistory } = body;

    // Validate required fields
    if (!query || typeof query !== 'string') {
      console.error(`[${requestId}] Validation failed: Missing or invalid query`);
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required and must be a string',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

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

    if (conversationHistory && !Array.isArray(conversationHistory)) {
      console.error(`[${requestId}] Validation failed: conversationHistory must be an array`);
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation history must be an array',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Processing query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    console.log(`[${requestId}] Context: ${lectures.length} lectures, ${questionSets.length} question sets, ${studySessions.length} sessions`);
    console.log(`[${requestId}] Conversation history: ${conversationHistory?.length || 0} messages`);

    // Call the AI flow
    const answer = await answerStudyBuddyQuery({
      query,
      lectures,
      questionSets,
      studySessions,
      conversationHistory: conversationHistory || [],
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Answer generated successfully in ${duration}ms`);
    console.log(`[${requestId}] Answer length: ${answer.length} chars`);

    return NextResponse.json({
      success: true,
      answer,
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
