import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, testConnection } from '../services/firebase';
import { getErrorMessage } from '../utils/errors';

interface AuthContextType {
  user: User | null;
  isAuthReady: boolean;
  isDemoMode: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  setDemoMode: (enabled: boolean) => void;
  clearAuthError: () => void;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isDemoMode, setDemoModeState] = useState<boolean>(() => {
    // Default to true (demo mode) if not signed in so visitors can explore immediately
    return true;
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Initial Firestore connection test
    testConnection().then((connected) => {
      setIsOnline(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);

      if (currentUser) {
        // When real user is signed in, exit demo mode
        setDemoModeState(false);
        try {
          // Sync user profile to Firestore /users/{uid}
          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Celebration Host',
              photoURL: currentUser.photoURL || '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Could not sync user profile to Firestore:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign-in error:', err);
      let message = 'Failed to sign in with Google.';
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === 'auth/popup-blocked') {
        message = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (firebaseError.code === 'auth/cancelled-popup-request' || firebaseError.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in popup was closed before completing.';
      } else if (firebaseError.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for Google sign-in in Firebase Console. Please add it in Firebase Authentication Settings.';
      } else if (firebaseError.code === 'auth/operation-not-allowed') {
        message = 'Google Sign-in provider is not enabled in Firebase Console.';
      } else if (firebaseError.message) {
        message = firebaseError.message;
      }
      setAuthError(message);
      throw err;
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
      setUser(null);
      // Return to demo mode so user can continue safely exploring
      setDemoModeState(true);
    } catch (err: unknown) {
      console.error('Sign-out error:', err);
      setAuthError(getErrorMessage(err) || 'Failed to sign out.');
    }
  };

  const setDemoMode = (enabled: boolean) => {
    setDemoModeState(enabled);
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthReady,
        isDemoMode,
        authError,
        signInWithGoogle,
        signOutUser,
        setDemoMode,
        clearAuthError,
        isOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
