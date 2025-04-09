import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
  updateProfile
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          console.log("User authenticated with Firebase:", firebaseUser.uid);
          
          // Set a basic profile right away so the app can function
          const basicProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
            photoUrl: firebaseUser.photoURL,
            username: ''
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

    return () => unsubscribe();
  }, [toast]);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      
      toast({
        title: "Success",
        description: "Signed in successfully"
      });
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
      
      toast({
        title: "Success",
        description: "Signed in successfully"
      });
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

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      
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
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

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