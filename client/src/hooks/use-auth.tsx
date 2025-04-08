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
import { useToast } from "./use-toast";

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  loginLocalUser: (username: string, password: string) => Promise<void>;
  registerLocalUser: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated with the backend (either local or Firebase)
  const checkCurrentSession = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/user", {
        credentials: "include"
      });
      
      if (response.ok) {
        const profileData = await response.json();
        console.log("User already authenticated with backend:", profileData);
        setProfile(profileData);
        setError(null);
      }
    } catch (err) {
      console.error("Error checking current session:", err);
    } finally {
      setLoading(false);
    }
  };

  // Monitor Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          console.log("User authenticated with Firebase:", firebaseUser.uid);
          
          // Get the ID token
          const idToken = await firebaseUser.getIdToken(true); // Force refresh token
          console.log("Firebase ID token obtained");
          
          // Authenticate with our backend
          console.log("Sending token to backend for verification");
          const response = await fetch("/api/auth/verify-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: idToken }),
            credentials: "include" // Important for session cookies
          });
          
          if (response.ok) {
            const profileData = await response.json();
            console.log("Successfully authenticated with backend:", profileData);
            setProfile(profileData);
            setError(null);
            
            toast({
              title: "Success",
              description: "Signed in successfully"
            });
          } else {
            let errorData = { message: "Unknown error" };
            try {
              errorData = await response.json();
            } catch (e) {
              // If response isn't valid JSON
              console.error("Non-JSON error response:", e);
            }
            
            console.error("Failed to authenticate with backend:", errorData);
            setError(`Backend authentication failed: ${errorData.message}`);
            
            toast({
              title: "Authentication Failed",
              description: errorData.message,
              variant: "destructive"
            });
            
            // In case of 401, sign the user out from Firebase too
            if (response.status === 401) {
              await firebaseSignOut(auth);
              setUser(null);
            }
          }
        } catch (error) {
          console.error("Error authenticating with backend:", error);
          setError(`Backend authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          toast({
            title: "Error",
            description: "Failed to authenticate with server",
            variant: "destructive"
          });
        }
      } else {
        console.log("No user signed in with Firebase");
        // Don't clear profile here as user might be logged in locally
        // We'll check session in a separate effect
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Check for existing session on app load
  useEffect(() => {
    checkCurrentSession();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      const authError = error as AuthError;
      
      // Handle specific error cases
      if (authError.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for sign-in. Please use email authentication instead.");
      } else {
        setError(authError.message || "Failed to sign in with Google");
      }
      
      toast({
        title: "Sign In Failed",
        description: authError.message || "Failed to sign in with Google",
        variant: "destructive"
      });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in with email:", error);
      const authError = error as AuthError;
      
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        setError("Invalid email or password");
      } else {
        setError(authError.message || "Failed to sign in");
      }
      
      toast({
        title: "Sign In Failed",
        description: authError.message || "Failed to sign in with email",
        variant: "destructive"
      });
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      
      toast({
        title: "Success",
        description: "Account created successfully"
      });
    } catch (error) {
      console.error("Error signing up with email:", error);
      const authError = error as AuthError;
      
      if (authError.code === 'auth/email-already-in-use') {
        setError("Email already in use");
      } else if (authError.code === 'auth/weak-password') {
        setError("Password is too weak");
      } else {
        setError(authError.message || "Failed to sign up");
      }
      
      toast({
        title: "Registration Failed",
        description: authError.message || "Failed to create account",
        variant: "destructive"
      });
    }
  };

  // Local authentication methods
  const loginLocalUser = async (username: string, password: string) => {
    setError(null);
    setLocalLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });
      
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        
        toast({
          title: "Success",
          description: "Logged in successfully"
        });
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Login failed");
        
        toast({
          title: "Login Failed",
          description: errorData.message || "Invalid username or password",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setError(error instanceof Error ? error.message : "Login failed");
      
      toast({
        title: "Login Error",
        description: "An unexpected error occurred during login",
        variant: "destructive"
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const registerLocalUser = async (username: string, email: string, password: string) => {
    setError(null);
    setLocalLoading(true);
    
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username, 
          email, 
          password,
          displayName: username 
        }),
        credentials: "include"
      });
      
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        
        toast({
          title: "Success",
          description: "Account created successfully"
        });
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Registration failed");
        
        toast({
          title: "Registration Failed",
          description: errorData.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error registering:", error);
      setError(error instanceof Error ? error.message : "Registration failed");
      
      toast({
        title: "Registration Error",
        description: "An unexpected error occurred during registration",
        variant: "destructive"
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      // If Firebase user is logged in, sign out from Firebase
      if (user) {
        await firebaseSignOut(auth);
      }
      
      // Always sign out from our backend
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      
      // Reset local state
      setProfile(null);
      
      toast({
        title: "Success",
        description: "Signed out successfully"
      });
    } catch (error) {
      console.error("Error signing out:", error);
      
      toast({
        title: "Error",
        description: "Failed to sign out completely",
        variant: "destructive"
      });
    }
  };

  const isLoading = loading || localLoading;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading,
      isLoading,
      error,
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      loginLocalUser,
      registerLocalUser,
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