import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  registerWithEmailPassword,
  loginWithEmailPassword,
  logoutUser,
  sendPasswordReset,
  getFriendlyAuthErrorMessage,
} from '../services/firebase';
import { storageService } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let resolved = false;

    // Safety timeout: Never leave the UI stuck in loading if Firebase auth is offline or partitioned
    const timer = setTimeout(() => {
      if (!resolved) {
        setLoading(false);
      }
    }, 1500);

    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      resolved = true;
      clearTimeout(timer);
      try {
        if (currentUser) {
          storageService.initForUser(
            currentUser.uid,
            currentUser.email,
            currentUser.displayName
          );
          setUser(currentUser);
        } else {
          storageService.initForUser(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Error in onAuthStateChanged listener:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const loggedUser = await loginWithEmailPassword(email, password);
      storageService.initForUser(loggedUser.uid, loggedUser.email, loggedUser.displayName);
      setUser(loggedUser);
    } catch (err: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code || err?.message || 'Login failed');
      throw new Error(friendlyMsg);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const newUser = await registerWithEmailPassword(email, password, displayName);
      storageService.initForUser(newUser.uid, newUser.email, displayName || newUser.displayName);
      setUser(newUser);
    } catch (err: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code || err?.message || 'Registration failed');
      throw new Error(friendlyMsg);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      storageService.initForUser(null);
      setUser(null);
    } catch (err: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code || err?.message || 'Logout failed');
      throw new Error(friendlyMsg);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordReset(email);
    } catch (err: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code || err?.message || 'Password reset failed');
      throw new Error(friendlyMsg);
    }
  };

  const continueAsGuest = () => {
    const guestUser = {
      uid: 'guest_user',
      email: 'guest@smartexpense.app',
      displayName: 'Guest (Demo)',
      emailVerified: true,
      isAnonymous: true,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
      providerId: 'demo',
    } as unknown as User;
    storageService.initForUser('guest_user', 'guest@smartexpense.app', 'Guest (Demo)');
    setUser(guestUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout, resetPassword, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
