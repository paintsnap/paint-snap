import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { 
  auth, 
  googleProvider, 
  createUserProfile, 
  db,
  usersCollection
} from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserProfile } from "@shared/schema";
import { useToast } from "./use-toast";
import { createDefaultProject } from "../lib/firestore";

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monitor Firebase auth state
  useEffect(() => {
    let tokenRefreshInterval: number | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clear any existing token refresh interval
      if (tokenRefreshInterval) {
        window.clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
      }
      
      if (firebaseUser) {
        try {
          console.log("User authenticated with Firebase:", firebaseUser.uid);
          
          // Proactively refresh the token to avoid expiration
          // This is a preventative measure that keeps the token fresh
          tokenRefreshInterval = window.setInterval(async () => {
            try {
              // Force token refresh every 45 minutes (tokens expire after 1 hour)
              const token = await firebaseUser.getIdToken(true);
              console.log("Firebase token refreshed proactively");
              
              // Verify the backend still recognizes this token with a lightweight request
              try {
                const response = await fetch('/api/user', {
                  credentials: 'include',
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  }
                });
                
                if (!response.ok && response.status === 401) {
                  console.warn("Backend session expired despite valid Firebase token. Attempting recovery...");
                  // Attempt to reauthenticate with the backend
                  await fetch('/api/verify-token', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                      'Content-Type': 'application/json',
                      'Cache-Control': 'no-cache',
                      'Pragma': 'no-cache'
                    },
                    body: JSON.stringify({ token })
                  });
                }
              } catch (backendError) {
                console.error("Error verifying token with backend:", backendError);
              }
            } catch (tokenError) {
              console.error("Error refreshing token:", tokenError);
            }
          }, 45 * 60 * 1000); // 45 minutes interval
          
          // Set a basic profile right away so the app can function
          const basicProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
            photoUrl: firebaseUser.photoURL,
            username: '',
            accountType: 'basic' // Default to basic account
          };
          
          setProfile(basicProfile);
          
          try {
            // Try to get user profile from Firestore (this might fail if there's connectivity issues)
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              // User profile exists - update with Firestore data
              const userData = userDoc.data();
              setProfile({
                ...basicProfile,
                displayName: userData.displayName || basicProfile.displayName,
                photoUrl: userData.photoURL || basicProfile.photoUrl,
                username: userData.username || ''
              });
            } else {
              // Create user profile if it doesn't exist
              await createUserProfile(firebaseUser);
            }
            
            setError(null);
          } catch (firestoreError) {
            // Log the Firestore error but continue with the basic profile
            console.error("Error fetching user profile from Firestore:", firestoreError);
            console.log("Continuing with basic profile data from Firebase Auth");
            
            // Don't set error or show toast here - let the app continue with basic profile
            // This is important for giving the user a better experience when Firestore has issues
          }
        } catch (error) {
          console.error("Error in authentication process:", error);
          setError(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          toast({
            title: "Authentication Error",
            description: "There was a problem signing you in. Please try again.",
            variant: "destructive"
          });
          
          // Make sure we still unset loading even if there's an error
          setLoading(false);
        }
      } else {
        console.log("No user signed in with Firebase");
        setProfile(null);
      }
      
      setLoading(false);
    });

    // Clean up function to handle component unmount
    return () => {
      unsubscribe();
      // Clear token refresh interval
      if (tokenRefreshInterval) {
        window.clearInterval(tokenRefreshInterval);
      }
    };
  }, [toast]);

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
      
      // Create user-friendly error messages
      let errorMessage = "Sorry, we couldn't sign you in. Please try again.";
      let errorTitle = "Sign In Failed";
      
      // Map Firebase error codes to user-friendly messages
      switch (authError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = "The email or password you entered is incorrect. Please try again.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled. Please contact support.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many unsuccessful login attempts. Please try again later or reset your password.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your internet connection and try again.";
          break;
        default:
          errorMessage = "Sign in failed. Please check your details and try again.";
      }
      
      // Set the error for the form
      setError(errorMessage);
      
      // Show toast notification
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    setError(null);
    try {
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Set display name if provided
      if (displayName && firebaseUser) {
        await updateProfile(firebaseUser, { displayName });
      }
      
      // Try to create user profile in Firestore, but continue if it fails
      try {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          displayName: displayName || email.split('@')[0],
          email,
          photoURL: null,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
        
        // Try to create a default project for the new user
        try {
          const defaultProject = await createDefaultProject(firebaseUser);
          console.log("Default project created for new user:", defaultProject.id);
          
          // Helpful success message
          toast({
            title: "Setup Complete",
            description: "Default project created and ready to use"
          });
        } catch (projectError: any) {
          console.error("Error creating default project:", projectError);
          
          // Show specific error for security rules issues
          if (projectError.code === 'permission-denied') {
            console.error("⚠️ FIREBASE SECURITY RULES ISSUE: Make sure your Firestore rules allow write access to authenticated users");
            toast({
              title: "Security Rules Issue",
              description: "Your Firebase security rules may need updating. Project creation failed.",
              variant: "destructive"
            });
          }
          
          // Don't throw error - account is still created, but alert the user
          toast({
            title: "Partial Setup",
            description: "Account created, but default project setup failed. Some features may be limited.",
            variant: "destructive"
          });
        }
      } catch (firestoreError) {
        console.error("Error creating user profile in Firestore:", firestoreError);
        console.log("User created in Firebase Auth but profile creation in Firestore failed. This will be retried on next sign-in.");
        // Don't throw error - basic authentication still works
      }
      
      toast({
        title: "Success",
        description: "Account created successfully"
      });
    } catch (error) {
      console.error("Error signing up with email:", error);
      const authError = error as AuthError;
      
      // Create user-friendly error messages
      let errorMessage = "Sorry, we couldn't create your account. Please try again.";
      let errorTitle = "Registration Failed";
      
      // Map Firebase error codes to user-friendly messages
      switch (authError.code) {
        case 'auth/email-already-in-use':
          errorMessage = "This email address is already registered. Please use a different email or try logging in.";
          break;
        case 'auth/weak-password':
          errorMessage = "Please use a stronger password. It should be at least 6 characters long.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/operation-not-allowed':
          errorMessage = "Account creation is currently disabled. Please try again later.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your internet connection and try again.";
          break;
        default:
          errorMessage = "Account creation failed. Please check your details and try again.";
      }
      
      // Set the error for the form
      setError(errorMessage);
      
      // Show toast notification
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      
      // Reset local state
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
      
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  // Password reset function
  const sendPasswordReset = async (email: string): Promise<void> => {
    setError(null);
    try {
      // Configure ActionCodeSettings to properly handle the password reset
      const actionCodeSettings = {
        // URL you want to redirect back to after password reset
        url: window.location.origin + '/auth',
        // This must be true for email link sign-in
        handleCodeInApp: false
      };
      
      // Use the enhanced version with actionCodeSettings
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email inbox and spam folder for instructions to reset your password.",
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      const authError = error as AuthError;
      
      // Create user-friendly error messages
      let errorMessage = "We couldn't send a password reset email. Please try again.";
      let errorTitle = "Reset Failed";
      
      // Map Firebase error codes to user-friendly messages
      switch (authError.code) {
        case 'auth/user-not-found':
          errorMessage = "We couldn't find an account with that email address. Please check and try again.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/missing-android-pkg-name':
        case 'auth/missing-continue-uri':
        case 'auth/missing-ios-bundle-id':
        case 'auth/invalid-continue-uri':
        case 'auth/unauthorized-continue-uri':
          errorMessage = "There's a problem with our password reset system. Please contact support.";
          break;
        default:
          errorMessage = "Password reset failed. Please try again later.";
      }
      
      // Set the error for the form
      setError(errorMessage);
      
      // Show toast notification
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
      
      // Don't rethrow, just return
      return;
    }
  };
  
  // Email verification function
  const verifyEmail = async () => {
    setError(null);
    if (!user) {
      setError("You must be logged in to verify your email.");
      return;
    }
    
    try {
      await sendEmailVerification(user);
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your email to verify your account.",
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      const authError = error as AuthError;
      
      // Create user-friendly error messages
      let errorMessage = "We couldn't send a verification email. Please try again later.";
      let errorTitle = "Verification Failed";
      
      // Map Firebase error codes to user-friendly messages
      switch (authError.code) {
        case 'auth/too-many-requests':
          errorMessage = "Too many requests. Please try again later.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your internet connection and try again.";
          break;
        default:
          errorMessage = "Verification email failed to send. Please try again later.";
      }
      
      // Set the error for the form
      setError(errorMessage);
      
      // Show toast notification
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  // Check if email is verified
  const isEmailVerified = user?.emailVerified || false;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading,
      isLoading: loading,
      error,
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      signOut,
      sendPasswordReset,
      verifyEmail,
      isEmailVerified
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