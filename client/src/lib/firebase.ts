import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { 
  getFirestore, enableIndexedDbPersistence, collection, doc, setDoc, getDoc, 
  getDocs, query, where, updateDoc, deleteDoc, orderBy, Timestamp, 
  DocumentReference, FieldValue, serverTimestamp, connectFirestoreEmulator
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "1234567890", // Default value, will be ignored if not used
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug Firebase configuration during initialization
console.log("Firebase configuration:", {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? "Set" : "Missing",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ? "Set" : "Missing",
});

// Check for missing environment variables
if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID || !import.meta.env.VITE_FIREBASE_APP_ID) {
  console.error(`
  ================================================================
  MISSING FIREBASE CONFIGURATION! Please check your environment variables.
  
  Make sure you have the following set in your environment:
  - VITE_FIREBASE_API_KEY
  - VITE_FIREBASE_PROJECT_ID
  - VITE_FIREBASE_APP_ID
  
  If you've just added these, you may need to restart the application.
  ================================================================
  `);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firestore with better settings for Cloudflare Pages and cross-browser support
try {
  // Only enable persistence in production environment to avoid development issues
  if (import.meta.env.PROD) {
    // Enable persistence with default settings
    // The Firebase v9 API doesn't support synchronizeTabs directly
    enableIndexedDbPersistence(db)
      .then(() => {
        console.log("Firestore persistence enabled successfully");
      })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open with different settings, persistence still works in other tabs
          console.warn('Persistence failed in this tab but may be active in others');
        } else if (err.code === 'unimplemented') {
          // The current browser does not support all of the features required for persistence
          console.warn('Persistence is not available in this browser');
        } else {
          console.error('Error enabling persistence:', err);
        }
        
        // Still continue with the app - failed persistence is not critical
        console.log("Firestore will continue without local persistence");
      });
  } else {
    console.log("Firestore persistence disabled in development environment");
  }
  
  console.log("Firestore initialized. Error handling for unavailable service implemented.");
} catch (error) {
  console.error("Error initializing Firestore:", error);
  console.log("Proceeding with Firestore without persistence");
}

// Export providers for authentication
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Collection references
export const usersCollection = collection(db, "users");
export const areasCollection = collection(db, "areas");
export const photosCollection = collection(db, "photos");
export const tagsCollection = collection(db, "tags");

// Firebase helpers
export const createUserProfile = async (user: User, additionalData: any = {}) => {
  if (!user) return;
  
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  
  if (!snapshot.exists()) {
    const { email, displayName, photoURL } = user;
    const createdAt = serverTimestamp();
    
    try {
      await setDoc(userRef, {
        displayName,
        email,
        photoURL,
        createdAt,
        ...additionalData
      });
    } catch (error) {
      console.error("Error creating user profile", error);
    }
  }
  
  return userRef;
};

// Resize image before upload
export const resizeImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to file format
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Image loading error'));
    };
  });
};