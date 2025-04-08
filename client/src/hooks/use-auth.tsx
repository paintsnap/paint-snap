import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { UserProfile } from "@shared/schema";

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  authError: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Get the ID token
          const idToken = await user.getIdToken();
          
          // Authenticate with our backend
          const response = await fetch("/api/auth/verify-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: idToken }),
          });
          
          if (response.ok) {
            const profileData = await response.json();
            setProfile(profileData);
          } else {
            console.error("Failed to authenticate with backend");
          }
        } catch (error) {
          console.error("Error authenticating with backend:", error);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      const authError = error as AuthError;
      
      // Handle specific error cases
      if (authError.code === 'auth/unauthorized-domain') {
        setAuthError("This domain is not authorized for sign-in. Please use email authentication instead.");
      } else {
        setAuthError(authError.message || "Failed to sign in with Google");
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in with email:", error);
      const authError = error as AuthError;
      
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        setAuthError("Invalid email or password");
      } else {
        setAuthError(authError.message || "Failed to sign in");
      }
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing up with email:", error);
      const authError = error as AuthError;
      
      if (authError.code === 'auth/email-already-in-use') {
        setAuthError("Email already in use");
      } else if (authError.code === 'auth/weak-password') {
        setAuthError("Password is too weak");
      } else {
        setAuthError(authError.message || "Failed to sign up");
      }
    }
  };

  const signOut = async () => {
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      // Also sign out from our backend
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      authError,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};