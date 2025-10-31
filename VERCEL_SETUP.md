# Vercel Deployment Setup Guide

This guide explains how to properly configure environment variables in Vercel to fix the authentication issues.

## Problem

If you see the error: **"Couldn't complete verification, please try again later"**

This means Firebase is not properly initialized because environment variables are missing or incorrectly configured.

## Solution: Configure Environment Variables in Vercel

### Step 1: Access Vercel Environment Variables

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your **MedSphere** project
3. Click **Settings** (top navigation)
4. Click **Environment Variables** (left sidebar)

### Step 2: Add Required Firebase Variables

You need to add **6 Firebase environment variables**. Get these values from your Firebase Console:

#### How to get Firebase configuration:

1. Go to: https://console.firebase.google.com
2. Select your **MedSphere** project
3. Click **⚙️ Project Settings** (gear icon)
4. Scroll down to **Your apps** section
5. Find your web app or click **</> (Add app)** if none exists
6. Copy the `firebaseConfig` object values

#### Variables to add in Vercel:

| Variable Name | Example Value | Description |
|--------------|---------------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyC...` | Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `medsphere-xxx.firebaseapp.com` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `medsphere-xxx` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `medsphere-xxx.appspot.com` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123456:web:abc123` | Firebase App ID |

**Also add the Gemini API key:**

| Variable Name | Example Value | Description |
|--------------|---------------|-------------|
| `GEMINI_API_KEY` | `AIzaSyC...` | Google Gemini API Key |

### Step 3: Configure for All Environments

**IMPORTANT:** For each variable you add:

1. ✅ Check **Production**
2. ✅ Check **Preview**
3. ✅ Check **Development**

This ensures the variables work in all deployment environments.

### Step 4: Redeploy

After adding all variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **⋯ (three dots)** → **Redeploy**
4. ✅ Check **Use existing Build Cache** (optional, for faster deployment)
5. Click **Redeploy**

### Step 5: Verify Setup

Once redeployment completes:

1. Open your site: https://your-site.vercel.app
2. Open **Browser Console** (F12 → Console tab)
3. Look for these logs:

```
[FIREBASE CONFIG] Loading Firebase configuration...
[FIREBASE CONFIG] Environment variables status: { ... }
[FIREBASE CONFIG] ✓ All required variables present
[FIREBASE] ✓ Firebase initialized successfully
[VERIFICATION] ✓ Firebase initialized successfully
```

If you see:
```
[FIREBASE CONFIG] ✗ Missing critical environment variables: [...]
```

Then go back to Step 2 and add the missing variables.

## Testing Authentication

### Test with Existing Student ID

1. Enter a Student ID from your JSON files (e.g., from `src/lib/student-ids/level-1.json`)
2. Click **Verify**
3. Should login successfully ✅

### Test with Manually Added User

1. Login as admin (Super Admin ID: `221100154`)
2. Go to **Admin Panel** → **Users** → **Add User**
3. Fill in:
   - Full Name: "Test User"
   - Student ID: "999999999"
   - Email: "test@example.com"
   - Level: "Level 1"
4. Click **Add User**
5. Logout
6. Login with Student ID: `999999999`
7. Should work! ✅

## Troubleshooting

### Issue: "Database connection failed"

**Cause:** Firebase environment variables are missing or incorrect.

**Solution:**
1. Check all 6 `NEXT_PUBLIC_FIREBASE_*` variables are set in Vercel
2. Verify values match your Firebase Console exactly
3. Make sure to include the variable in all environments (Production, Preview, Development)
4. Redeploy after changes

### Issue: "Invalid Student ID"

**Cause:** Student ID is not in static JSON files and not in Firestore.

**Solution:**
1. Check if ID exists in `src/lib/student-ids/level-*.json`
2. OR add user through Admin Panel first
3. Then try logging in

### Issue: "Access denied"

**Cause:** Firestore security rules are too restrictive.

**Solution:**
Go to Firebase Console → Firestore Database → Rules and ensure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to users collection for authentication
    match /users/{userId} {
      allow read: if true;  // Allow anyone to read user documents
      allow write: if request.auth != null;  // Only authenticated users can write
    }

    // Other collections...
  }
}
```

### Issue: Still not working after following all steps

**Debug Steps:**

1. Open browser console (F12)
2. Look for errors starting with `[FIREBASE CONFIG]`, `[FIREBASE]`, `[AUTH]`, or `[VERIFICATION]`
3. Take a screenshot of all error messages
4. Check Vercel deployment logs:
   - Go to Vercel → Deployments → Click latest deployment → Runtime Logs
   - Look for errors

## Important Notes

- ⚠️ All Firebase variables **MUST** start with `NEXT_PUBLIC_` (except `GEMINI_API_KEY`)
- ⚠️ After adding/changing variables, you **MUST** redeploy
- ⚠️ Variables added to Vercel are **NOT** stored in your code (they're environment-specific)
- ✅ Keep your Firebase API keys safe but note they're meant to be public (protected by Firestore rules)

## Testing Page

Access the authentication testing page to debug issues:
```
https://your-site.vercel.app/test-auth-system
```

This page will show:
- ✅ Database connection status
- ✅ Student ID validation results
- ✅ User profile fetch results
- ✅ Complete verification flow

---

**If you've followed all steps and still have issues, check the browser console for detailed error logs starting with [FIREBASE] or [AUTH] prefixes.**
