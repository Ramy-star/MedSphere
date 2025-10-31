/**
 * API Route: Document Chat
 * Handles AI-powered chat about document content
 *
 * This endpoint provides a bridge between the browser (client components)
 * and the Genkit AI SDK which requires server-side execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatAboutDocument } from '@/ai/flows/chat-flow';

// Configure runtime and timeout for AI operations
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for AI processing

/**
 * POST /api/ai/chat
 *
 * Request Body:
 * {
 *   chatHistory: Array<{role: 'user' | 'model', text: string}>,
 *   question: string,
 *   documentContent: string,
 *   hasQuestions?: boolean,
 *   questionsContent?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   response: string (AI response text)
 * }
 * OR
 * {
 *   success: false,
 *   error: string (error message),
 *   errorType: 'api_key' | 'quota' | 'timeout' | 'network' | 'unknown'
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[${requestId}] Document chat request received`);
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { chatHistory, question, documentContent, hasQuestions, questionsContent } = body;

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

    if (!documentContent || typeof documentContent !== 'string') {
      console.error(`[${requestId}] Validation failed: Missing or invalid documentContent`);
      return NextResponse.json(
        {
          success: false,
          error: 'Document content is required and must be a string',
          errorType: 'validation'
        },
        { status: 400 }
      );
    }

    // Validate chat history format
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
    console.log(`[${requestId}] Document content length: ${documentContent.length} chars`);
    console.log(`[${requestId}] Chat history length: ${chatHistory?.length || 0} messages`);

    // Call the AI flow (this runs on the server with access to environment variables)
    const response = await chatAboutDocument({
      question,
      documentContent,
      chatHistory: chatHistory || [],
      hasQuestions: hasQuestions || false,
      questionsContent: questionsContent || '',
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Chat completed successfully in ${duration}ms`);
    console.log(`[${requestId}] Response length: ${response.length} chars`);

    return NextResponse.json({
      success: true,
      response,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${duration}ms:`, error);

    // Categorize error types for better client-side handling
    let errorType = 'unknown';
    let statusCode = 500;
    let errorMessage = error.message || 'An unexpected error occurred';

    // Check for specific error types
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
