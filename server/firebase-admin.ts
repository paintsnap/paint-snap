import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;
let firestore: admin.firestore.Firestore | null = null;
let storage: admin.storage.Storage | null = null;

export function getFirebaseAdmin() {
  if (!app) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    // Check if we have all required credentials
    if (!projectId || !clientEmail || !privateKey) {
      console.error("Missing Firebase service account credentials:", {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey
      });
      throw new Error("Firebase service account credentials are missing");
    }
    
    // Initialize the app with service account credentials
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        }),
        storageBucket: `${projectId}.appspot.com`
      });
      console.log("Firebase Admin initialized successfully with service account credentials");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin with service account:", error);
      throw error;
    }
  }
  
  return app;
}

export function getFirestore() {
  if (!firestore) {
    const app = getFirebaseAdmin();
    firestore = app.firestore();
    // Set timestamp settings
    firestore.settings({ timestampsInSnapshots: true });
  }
  return firestore;
}

export function getStorage() {
  if (!storage) {
    const app = getFirebaseAdmin();
    storage = app.storage();
  }
  return storage;
}

// Collection references
export const getCollectionRef = (collection: string) => {
  return getFirestore().collection(collection);
};

export const getUsersRef = () => getCollectionRef('users');
export const getAreasRef = () => getCollectionRef('areas');
export const getPhotosRef = () => getCollectionRef('photos');
export const getTagsRef = () => getCollectionRef('tags');

// Helper functions for data conversion
export const convertTimestampToDate = (timestamp: admin.firestore.Timestamp) => {
  return timestamp.toDate();
};

export const convertDocumentData = <T extends Record<string, any>>(doc: admin.firestore.DocumentSnapshot): T | null => {
  if (!doc.exists) return null;
  
  const data = doc.data();
  // Convert any Firestore Timestamps to JavaScript Dates
  const convertedData: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data || {})) {
    if (value instanceof admin.firestore.Timestamp) {
      convertedData[key] = convertTimestampToDate(value);
    } else {
      convertedData[key] = value;
    }
  }
  
  // First cast to unknown, then to T to avoid TypeScript errors
  return {
    id: doc.id,
    ...convertedData
  } as unknown as T;
};