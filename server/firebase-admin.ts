import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirebaseAdmin() {
  if (!app) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    
    // Initialize the app if it hasn't been initialized yet
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }
  
  return app;
}