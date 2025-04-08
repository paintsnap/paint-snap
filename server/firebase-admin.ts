import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

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
      });
      console.log("Firebase Admin initialized successfully with service account credentials");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin with service account:", error);
      throw error; // Re-throw the error instead of falling back to a non-functional config
    }
  }
  
  return app;
}