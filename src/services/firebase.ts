import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web configuration is safe to expose in a frontend bundle. Values can
// be overridden for forks/deployments with VITE_FIREBASE_* environment vars.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB2rDG5QrPuWilxD0DLKt4RH2hrj_oauYs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'aka-academy-d9003.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'aka-academy-d9003',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'aka-academy-d9003.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '348528938812',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:348528938812:web:9361cc890a8c8e879d9839',
};

// Initialize Firebase once
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Register a new user with Email and Password
 */
export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, {
      displayName: displayName.trim(),
    });
  }
  return userCredential.user;
}

/**
 * Sign in an existing user with Email and Password
 */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Log out the currently authenticated user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Maps Firebase Auth error codes to user-friendly messages
 */
export function getFriendlyAuthErrorMessage(errorCodeOrMessage: string): string {
  if (errorCodeOrMessage.includes('auth/email-already-in-use')) {
    return 'This email address is already registered. Please sign in instead.';
  }
  if (errorCodeOrMessage.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (errorCodeOrMessage.includes('auth/operation-not-allowed')) {
    return 'Email/password sign-in is not enabled in Firebase Console. Please enable it under Firebase Auth Providers.';
  }
  if (errorCodeOrMessage.includes('auth/weak-password')) {
    return 'Password is too weak. Please choose a password with at least 6 characters.';
  }
  if (errorCodeOrMessage.includes('auth/user-disabled')) {
    return 'This user account has been disabled. Please contact support.';
  }
  if (
    errorCodeOrMessage.includes('auth/user-not-found') ||
    errorCodeOrMessage.includes('auth/wrong-password') ||
    errorCodeOrMessage.includes('auth/invalid-credential')
  ) {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }
  if (errorCodeOrMessage.includes('auth/too-many-requests')) {
    return 'Too many failed login attempts. Access temporarily disabled. Please reset password or try again later.';
  }
  if (errorCodeOrMessage.includes('auth/network-request-failed')) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
  if (errorCodeOrMessage.includes('auth/popup-closed-by-user')) {
    return 'The sign-in window was closed before completing.';
  }
  return errorCodeOrMessage || 'An unexpected error occurred during authentication. Please try again.';
}
