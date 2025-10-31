'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type TestStatus = 'idle' | 'running' | 'success' | 'error';

interface TestResult {
  status: TestStatus;
  message: string;
  duration?: number;
  response?: any;
}

export default function TestAISystemPage() {
  const [chatTest, setChatTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [studyBuddyTest, setStudyBuddyTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [studyBuddyChatTest, setStudyBuddyChatTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [questionGenTest, setQuestionGenTest] = useState<TestResult>({ status: 'idle', message: '' });

  const StatusIcon = ({ status }: { status: TestStatus }) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const testDocumentChat = async () => {
    setChatTest({ status: 'running', message: 'Testing document chat endpoint...' });
    const startTime = Date.now();

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory: [],
          question: 'What is this document about?',
          documentContent: 'This is a test document about artificial intelligence and machine learning.',
          hasQuestions: false,
          questionsContent: '',
        }),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (data.success) {
        setChatTest({
          status: 'success',
          message: `Success! Response received in ${duration}ms`,
          duration,
          response: data.response.substring(0, 100) + '...',
        });
      } else {
        setChatTest({
          status: 'error',
          message: `Failed: ${data.error}`,
          duration,
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setChatTest({
        status: 'error',
        message: `Error: ${error.message}`,
        duration,
      });
    }
  };

  const testStudyBuddyInsight = async () => {
    setStudyBuddyTest({ status: 'running', message: 'Testing study buddy insight endpoint...' });
    const startTime = Date.now();

    try {
      const response = await fetch('/api/ai/study-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Test User',
          username: 'testuser',
          filesUploaded: 5,
          foldersCreated: 3,
          examsCompleted: 2,
          aiQueries: 10,
          favoritesCount: 4,
          greeting: 'Good morning, Test User!',
        }),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (data.success) {
        setStudyBuddyTest({
          status: 'success',
          message: `Success! Insight received in ${duration}ms`,
          duration,
          response: data.result.mainInsight.substring(0, 100) + '...',
        });
      } else {
        setStudyBuddyTest({
          status: 'error',
          message: `Failed: ${data.error}`,
          duration,
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setStudyBuddyTest({
        status: 'error',
        message: `Error: ${error.message}`,
        duration,
      });
    }
  };

  const testStudyBuddyChat = async () => {
    setStudyBuddyChatTest({ status: 'running', message: 'Testing study buddy chat endpoint...' });
    const startTime = Date.now();

    try {
      const response = await fetch('/api/ai/study-buddy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'What should I study today?',
          userStats: {
            displayName: 'Test User',
            username: 'testuser',
            filesUploaded: 5,
            foldersCreated: 3,
            examsCompleted: 2,
            aiQueries: 10,
            favoritesCount: 4,
          },
          chatHistory: [],
        }),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (data.success) {
        setStudyBuddyChatTest({
          status: 'success',
          message: `Success! Answer received in ${duration}ms`,
          duration,
          response: data.answer.substring(0, 100) + '...',
        });
      } else {
        setStudyBuddyChatTest({
          status: 'error',
          message: `Failed: ${data.error}`,
          duration,
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setStudyBuddyChatTest({
        status: 'error',
        message: `Error: ${error.message}`,
        duration,
      });
    }
  };

  const testQuestionGeneration = async () => {
    setQuestionGenTest({ status: 'running', message: 'Testing question generation endpoint...' });
    const startTime = Date.now();

    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateText',
          prompt: 'Generate 3 multiple choice questions about this content.',
          documentContent: 'Artificial intelligence is the simulation of human intelligence processes by machines.',
        }),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (data.success) {
        setQuestionGenTest({
          status: 'success',
          message: `Success! Questions generated in ${duration}ms`,
          duration,
          response: typeof data.result === 'string' ? data.result.substring(0, 100) + '...' : JSON.stringify(data.result).substring(0, 100) + '...',
        });
      } else {
        setQuestionGenTest({
          status: 'error',
          message: `Failed: ${data.error}`,
          duration,
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setQuestionGenTest({
        status: 'error',
        message: `Error: ${error.message}`,
        duration,
      });
    }
  };

  const testAll = async () => {
    await testDocumentChat();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testStudyBuddyInsight();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testStudyBuddyChat();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testQuestionGeneration();
  };

  const allTestsStatus = [chatTest, studyBuddyTest, studyBuddyChatTest, questionGenTest];
  const allSuccess = allTestsStatus.every(t => t.status === 'success');
  const anyRunning = allTestsStatus.some(t => t.status === 'running');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">AI System Test Suite</h1>
          <p className="text-slate-400">Validate all AI endpoints are working correctly</p>
        </div>

        {allSuccess && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              All tests passed successfully! Your AI system is working correctly.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button
            onClick={testAll}
            disabled={anyRunning}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {anyRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Run All Tests
          </Button>
        </div>

        <div className="grid gap-4">
          {/* Test 1: Document Chat */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <StatusIcon status={chatTest.status} />
                    Document Chat API
                  </CardTitle>
                  <CardDescription>Tests /api/ai/chat endpoint</CardDescription>
                </div>
                <Button
                  onClick={testDocumentChat}
                  disabled={chatTest.status === 'running'}
                  variant="outline"
                  size="sm"
                >
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300">{chatTest.message}</p>
              {chatTest.response && (
                <p className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded">
                  {chatTest.response}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Test 2: Study Buddy Insight */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <StatusIcon status={studyBuddyTest.status} />
                    Study Buddy Insight API
                  </CardTitle>
                  <CardDescription>Tests /api/ai/study-buddy endpoint</CardDescription>
                </div>
                <Button
                  onClick={testStudyBuddyInsight}
                  disabled={studyBuddyTest.status === 'running'}
                  variant="outline"
                  size="sm"
                >
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300">{studyBuddyTest.message}</p>
              {studyBuddyTest.response && (
                <p className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded">
                  {studyBuddyTest.response}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Test 3: Study Buddy Chat */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <StatusIcon status={studyBuddyChatTest.status} />
                    Study Buddy Chat API
                  </CardTitle>
                  <CardDescription>Tests /api/ai/study-buddy-chat endpoint</CardDescription>
                </div>
                <Button
                  onClick={testStudyBuddyChat}
                  disabled={studyBuddyChatTest.status === 'running'}
                  variant="outline"
                  size="sm"
                >
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300">{studyBuddyChatTest.message}</p>
              {studyBuddyChatTest.response && (
                <p className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded">
                  {studyBuddyChatTest.response}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Test 4: Question Generation */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <StatusIcon status={questionGenTest.status} />
                    Question Generation API
                  </CardTitle>
                  <CardDescription>Tests /api/ai/generate-questions endpoint</CardDescription>
                </div>
                <Button
                  onClick={testQuestionGeneration}
                  disabled={questionGenTest.status === 'running'}
                  variant="outline"
                  size="sm"
                >
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300">{questionGenTest.message}</p>
              {questionGenTest.response && (
                <p className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded">
                  {questionGenTest.response}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Alert className="bg-slate-800/50 border-slate-700">
          <AlertCircle className="h-4 w-4 text-slate-400" />
          <AlertDescription className="text-slate-300">
            <strong>Note:</strong> These tests require a valid GEMINI_API_KEY environment variable.
            If tests fail, check your .env.local file and Vercel environment variables.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
