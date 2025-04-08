import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirebaseAdmin() {
  if (!app) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    
    // Initialize the app if it hasn't been initialized yet
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
        }),
        projectId,
      });
    } catch (error) {
      // Fallback to using just the project ID if service account is not available
      console.error("Failed to initialize Firebase Admin with service account:", error);
      console.log("Initializing Firebase Admin without service account credentials");
      
      app = admin.initializeApp({
        projectId,
      });
    }
  }
  
  return app;
}