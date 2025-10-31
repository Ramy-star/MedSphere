'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle, User } from 'lucide-react';
import { isStudentIdValid, getUserProfile, verifyAndCreateUser } from '@/lib/authService';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

type TestStatus = 'idle' | 'running' | 'success' | 'error';

interface TestResult {
  status: TestStatus;
  message: string;
  details?: any;
}

export default function TestAuthSystemPage() {
  const [studentId, setStudentId] = useState('');
  const [validationTest, setValidationTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [profileTest, setProfileTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [verificationTest, setVerificationTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [dbTest, setDbTest] = useState<TestResult>({ status: 'idle', message: '' });

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

  const testDatabaseConnection = async () => {
    setDbTest({ status: 'running', message: 'Testing Firestore connection...' });

    try {
      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      // Try to access a test document
      const testRef = doc(db, 'users', 'test');
      await getDoc(testRef);

      setDbTest({
        status: 'success',
        message: 'Firestore connection successful!',
      });
    } catch (error: any) {
      setDbTest({
        status: 'error',
        message: `Firestore error: ${error.message}`,
      });
    }
  };

  const testValidation = async () => {
    if (!studentId.trim()) {
      setValidationTest({ status: 'error', message: 'Please enter a Student ID' });
      return;
    }

    setValidationTest({ status: 'running', message: 'Validating Student ID...' });

    try {
      const isValid = await isStudentIdValid(studentId.trim());

      if (isValid) {
        setValidationTest({
          status: 'success',
          message: `Student ID "${studentId}" is valid!`,
        });
      } else {
        setValidationTest({
          status: 'error',
          message: `Student ID "${studentId}" is NOT valid (not in static list or Firestore)`,
        });
      }
    } catch (error: any) {
      setValidationTest({
        status: 'error',
        message: `Validation error: ${error.message}`,
      });
    }
  };

  const testGetProfile = async () => {
    if (!studentId.trim()) {
      setProfileTest({ status: 'error', message: 'Please enter a Student ID' });
      return;
    }

    setProfileTest({ status: 'running', message: 'Fetching user profile...' });

    try {
      const profile = await getUserProfile(studentId.trim());

      if (profile) {
        setProfileTest({
          status: 'success',
          message: `Profile found for "${profile.displayName || profile.username}"`,
          details: {
            email: profile.email || 'N/A',
            level: profile.level || 'N/A',
            createdAt: profile.createdAt || 'N/A',
          },
        });
      } else {
        setProfileTest({
          status: 'error',
          message: `No profile found in Firestore for Student ID "${studentId}"`,
        });
      }
    } catch (error: any) {
      setProfileTest({
        status: 'error',
        message: `Profile fetch error: ${error.message}`,
      });
    }
  };

  const testVerifyAndCreate = async () => {
    if (!studentId.trim()) {
      setVerificationTest({ status: 'error', message: 'Please enter a Student ID' });
      return;
    }

    setVerificationTest({ status: 'running', message: 'Verifying and creating user...' });

    try {
      const { userProfile, isNewUser } = await verifyAndCreateUser(studentId.trim());

      if (userProfile) {
        setVerificationTest({
          status: 'success',
          message: isNewUser
            ? `New user created for "${userProfile.displayName}"`
            : `Existing user found: "${userProfile.displayName}"`,
          details: {
            isNewUser,
            displayName: userProfile.displayName,
            email: userProfile.email || 'N/A',
            level: userProfile.level || 'N/A',
          },
        });
      } else {
        setVerificationTest({
          status: 'error',
          message: `Verification failed for Student ID "${studentId}"`,
        });
      }
    } catch (error: any) {
      setVerificationTest({
        status: 'error',
        message: `Verification error: ${error.message}`,
      });
    }
  };

  const testAll = async () => {
    await testDatabaseConnection();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testValidation();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testGetProfile();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testVerifyAndCreate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Authentication System Test Suite</h1>
          <p className="text-slate-400">Debug authentication and user creation issues</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Student ID Input</CardTitle>
            <CardDescription>Enter a Student ID to test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="Enter Student ID (e.g., 221100154)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white"
            />
            <Button onClick={testAll} className="w-full bg-blue-600 hover:bg-blue-700">
              Run All Tests
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {/* Test 1: Database Connection */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <StatusIcon status={dbTest.status} />
                    Database Connection
                  </CardTitle>
                  <CardDescription>Tests Firestore initialization</CardDescription>
                </div>
                <Button onClick={testDatabaseConnection} variant="outline" size="sm">
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300">{dbTest.message}</p>
            </CardContent>
          </Card>

          {/* Test 2: Student ID Validation */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <StatusIcon status={validationTest.status} />
                    Student ID Validation
                  </CardTitle>
                  <CardDescription>Checks if ID exists in static lists or Firestore</CardDescription>
                </div>
                <Button onClick={testValidation} variant="outline" size="sm" disabled={!studentId.trim()}>
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300">{validationTest.message}</p>
            </CardContent>
          </Card>

          {/* Test 3: Get User Profile */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <StatusIcon status={profileTest.status} />
                    Get User Profile
                  </CardTitle>
                  <CardDescription>Fetches user document from Firestore</CardDescription>
                </div>
                <Button onClick={testGetProfile} variant="outline" size="sm" disabled={!studentId.trim()}>
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300">{profileTest.message}</p>
              {profileTest.details && (
                <div className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded">
                  <pre>{JSON.stringify(profileTest.details, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test 4: Verify and Create User */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <StatusIcon status={verificationTest.status} />
                    Verify and Create User
                  </CardTitle>
                  <CardDescription>Full authentication flow (creates user if not exists)</CardDescription>
                </div>
                <Button onClick={testVerifyAndCreate} variant="outline" size="sm" disabled={!studentId.trim()}>
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-300">{verificationTest.message}</p>
              {verificationTest.details && (
                <div className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded">
                  <pre>{JSON.stringify(verificationTest.details, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Alert className="bg-slate-800/50 border-slate-700">
          <AlertCircle className="h-4 w-4 text-slate-400" />
          <AlertDescription className="text-slate-300">
            <strong>Note:</strong> Use this page to diagnose login and user creation issues.
            Test with both existing Student IDs (from JSON files) and manually created IDs.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
