/**
 * API Route: Question Generation
 * Handles AI-powered generation of questions, exams, and flashcards from documents
 *
 * This endpoint supports multiple operations:
 * - generateText: Generate questions/exams/flashcards in text format
 * - convertQuestions: Convert question text to structured JSON
 * - convertFlashcards: Convert flashcard text to structured JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText, convertQuestionsToJson, convertFlashcardsToJson } from '@/ai/flows/question-gen-flow';

// Configure runtime and timeout (longer for complex generation tasks)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for complex generation tasks

/**
 * POST /api/ai/generate-questions
 *
 * Request Body:
 * {
 *   action: 'generateText' | 'convertQuestions' | 'convertFlashcards',
 *   // For generateText action:
 *   prompt?: string,
 *   documentContent?: string,
 *   // For convertQuestions action:
 *   lectureName?: string,
 *   questionsText?: string,
 *   // For convertFlashcards action:
 *   flashcardsText?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   result: string | object (depends on action)
 * }
 * OR
 * {
 *   success: false,
 *   error: string,
 *   errorType: string
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[${requestId}] Question generation request received`);
  const startTime = Date.now();

  // Check for API key before processing
  if (!process.env.GEMINI_API_KEY) {
    console.error(`[${requestId}] ✗ CRITICAL: GEMINI_API_KEY not configured`);
    return NextResponse.json(
      {
        success: false,
        error: 'Server configuration error: AI service is not properly configured. Please contact the administrator to add GEMINI_API_KEY to environment variables.',
        errorType: 'configuration'
      },
      { status: 500 }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action || typeof action !== 'string') {
      console.error(`[${requestId}] Validation failed: Missing or invalid action`);
      return NextResponse.json(
        {
          success: false,
          error: 'Action is required and must be a string',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    const validActions = ['generateText', 'convertQuestions', 'convertFlashcards'];
    if (!validActions.includes(action)) {
      console.error(`[${requestId}] Validation failed: Invalid action "${action}"`);
      return NextResponse.json(
        {
          success: false,
          error: `Action must be one of: ${validActions.join(', ')}`,
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Processing action: ${action}`);

    let result: any;

    // Handle different actions
    switch (action) {
      case 'generateText': {
        const { prompt, documentContent } = body;

        // Validate required fields for generateText
        if (!prompt || typeof prompt !== 'string') {
          console.error(`[${requestId}] Validation failed: prompt is required for generateText`);
          return NextResponse.json(
            {
              success: false,
              error: 'Prompt is required and must be a string for generateText action',
              errorType: 'validation'
            },
            { status: 400 }
          );
        }

        if (!documentContent || typeof documentContent !== 'string') {
          console.error(`[${requestId}] Validation failed: documentContent is required for generateText`);
          return NextResponse.json(
            {
              success: false,
              error: 'Document content is required and must be a string for generateText action',
              errorType: 'validation'
            },
            { status: 400 }
          );
        }

        console.log(`[${requestId}] Generating text with prompt length: ${prompt.length} chars`);
        console.log(`[${requestId}] Document content length: ${documentContent.length} chars`);

        result = await generateText({
          prompt,
          documentContent,
        });

        console.log(`[${requestId}] Generated text length: ${result.length} chars`);
        break;
      }

      case 'convertQuestions': {
        const { lectureName, questionsText } = body;

        // Validate required fields for convertQuestions
        if (!lectureName || typeof lectureName !== 'string') {
          console.error(`[${requestId}] Validation failed: lectureName is required for convertQuestions`);
          return NextResponse.json(
            {
              success: false,
              error: 'Lecture name is required and must be a string for convertQuestions action',
              errorType: 'validation'
            },
            { status: 400 }
          );
        }

        if (!questionsText || typeof questionsText !== 'string') {
          console.error(`[${requestId}] Validation failed: questionsText is required for convertQuestions`);
          return NextResponse.json(
            {
              success: false,
              error: 'Questions text is required and must be a string for convertQuestions action',
              errorType: 'validation'
            },
            { status: 400 }
          );
        }

        console.log(`[${requestId}] Converting questions for lecture: ${lectureName}`);
        console.log(`[${requestId}] Questions text length: ${questionsText.length} chars`);

        result = await convertQuestionsToJson({
          lectureName,
          questionsText,
        });

        console.log(`[${requestId}] Converted to JSON successfully`);
        break;
      }

      case 'convertFlashcards': {
        const { lectureName, flashcardsText } = body;

        // Validate required fields for convertFlashcards
        if (!lectureName || typeof lectureName !== 'string') {
          console.error(`[${requestId}] Validation failed: lectureName is required for convertFlashcards`);
          return NextResponse.json(
            {
              success: false,
              error: 'Lecture name is required and must be a string for convertFlashcards action',
              errorType: 'validation'
            },
            { status: 400 }
          );
        }

        if (!flashcardsText || typeof flashcardsText !== 'string') {
          console.error(`[${requestId}] Validation failed: flashcardsText is required for convertFlashcards`);
          return NextResponse.json(
            {
              success: false,
              error: 'Flashcards text is required and must be a string for convertFlashcards action',
              errorType: 'validation'
            },
            { status: 400 }
          );
        }

        console.log(`[${requestId}] Converting flashcards for lecture: ${lectureName}`);
        console.log(`[${requestId}] Flashcards text length: ${flashcardsText.length} chars`);

        result = await convertFlashcardsToJson({
          lectureName,
          flashcardsText,
        });

        console.log(`[${requestId}] Converted to JSON successfully`);
        break;
      }

      default:
        // This should never happen due to validation above, but TypeScript needs it
        throw new Error(`Unhandled action: ${action}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Action "${action}" completed successfully in ${duration}ms`);

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${duration}ms:`, error);
    console.error(`[${requestId}] Error name:`, error.name);
    console.error(`[${requestId}] Error message:`, error.message);
    console.error(`[${requestId}] Error stack:`, error.stack);

    // Categorize error types
    let errorType = 'unknown';
    let statusCode = 500;
    let errorMessage = error.message || 'An unexpected error occurred';

    // Check for configuration/API key errors
    if (errorMessage.includes('API key') || errorMessage.includes('GEMINI_API_KEY') || errorMessage.includes('apiKey')) {
      errorType = 'configuration';
      errorMessage = 'Server configuration error: AI service API key is missing or invalid. Please contact the administrator to configure GEMINI_API_KEY in Vercel environment variables.';
      statusCode = 500;
    }
    // Check for Google AI specific errors
    else if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('authentication')) {
      errorType = 'authentication';
      errorMessage = 'AI service authentication failed. The API key may be invalid or expired. Please contact the administrator.';
      statusCode = 500;
    }
    // Check for quota/rate limit errors
    else if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      errorType = 'quota';
      errorMessage = 'AI service quota exceeded. Please try again later or contact the administrator.';
      statusCode = 429;
    }
    // Check for timeout errors
    else if (errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorMessage.includes('DEADLINE_EXCEEDED')) {
      errorType = 'timeout';
      errorMessage = 'AI request timed out. Please try again with a smaller document or simpler prompt.';
      statusCode = 504;
    }
    // Check for network errors
    else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('UNAVAILABLE')) {
      errorType = 'network';
      errorMessage = 'Network error occurred. Please check your connection and try again.';
      statusCode = 503;
    }

    console.error(`[${requestId}] Categorized as ${errorType} error with status ${statusCode}`);
    console.error(`[${requestId}] User-facing message: ${errorMessage}`);

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
