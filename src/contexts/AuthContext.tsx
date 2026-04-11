import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  role: string | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    throw error; // This will be caught by the ErrorBoundary
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true); // Prevent flash of unauthorized while fetching role
        
        // Check if user is admin
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let currentRole = 'user';
          let currentIsAdmin = false;

          if (userDoc.exists()) {
            currentRole = userDoc.data().role;
            currentIsAdmin = currentRole === 'admin';
          } else {
            // Bootstrapping the first admin
            if (currentUser.email === 'melissa@melissacummins.com' && currentUser.emailVerified) {
              await setDoc(userDocRef, {
                email: currentUser.email,
                role: 'admin'
              });
              currentRole = 'admin';
              currentIsAdmin = true;
            } else {
              // Default new users to 'user' role
              await setDoc(userDocRef, {
                email: currentUser.email,
                role: 'user'
              });
              currentRole = 'user';
              currentIsAdmin = false;
            }
          }
          
          setRole(currentRole);
          setIsAdmin(currentIsAdmin);
          setUser(currentUser);
        } catch (err) {
          console.error("Error checking admin status:", err);
          setRole(null);
          setIsAdmin(false);
          setUser(null);
          try {
            handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
          } catch (handledError) {
            setError(handledError as Error);
          }
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setRole(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
