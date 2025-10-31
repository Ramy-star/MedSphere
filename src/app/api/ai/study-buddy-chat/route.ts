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
 *   question: string,
 *   userStats: {
 *     displayName?: string,
 *     username: string,
 *     filesUploaded?: number,
 *     foldersCreated?: number,
 *     examsCompleted?: number,
 *     aiQueries?: number,
 *     favoritesCount?: number
 *   },
 *   chatHistory?: Array<{role: 'user' | 'model', text: string}>
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
    const { question, userStats, chatHistory } = body;

    // Validate required fields
    if (!question || typeof question !== 'string') {
      console.error(`[${requestId}] Validation failed: Missing or invalid question`);
      return NextResponse.json(
        {
          success: false,
          error: 'Question is required and must be a string',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    if (!userStats || typeof userStats !== 'object') {
      console.error(`[${requestId}] Validation failed: userStats must be an object`);
      return NextResponse.json(
        {
          success: false,
          error: 'User stats are required and must be an object',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    if (!userStats.username || typeof userStats.username !== 'string') {
      console.error(`[${requestId}] Validation failed: username is required in userStats`);
      return NextResponse.json(
        {
          success: false,
          error: 'Username is required in user stats',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    if (chatHistory && !Array.isArray(chatHistory)) {
      console.error(`[${requestId}] Validation failed: chatHistory must be an array`);
      return NextResponse.json(
        {
          success: false,
          error: 'Chat history must be an array',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Processing question: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"`);
    console.log(`[${requestId}] For user: ${userStats.username}`);
    console.log(`[${requestId}] Chat history: ${chatHistory?.length || 0} messages`);

    // Call the AI flow
    const answer = await answerStudyBuddyQuery({
      userStats,
      question,
      chatHistory: chatHistory || [],
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
