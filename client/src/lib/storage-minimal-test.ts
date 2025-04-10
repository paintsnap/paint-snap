import { ref, uploadString, getDownloadURL, getStorage } from "firebase/storage";
import { storage } from "./firebase";
import { getAuth } from "firebase/auth";

// Ultra-minimal test for Firebase Storage connectivity
export async function testMinimalUpload(): Promise<string | null> {
  try {
    console.log("=== MINIMAL STORAGE TEST ===");
    
    // Log authentication state
    const auth = getAuth();
    console.log("Authentication state:", {
      isAuthenticated: !!auth.currentUser,
      uid: auth.currentUser?.uid || 'not signed in'
    });
    
    // Log storage configuration
    const storageInstance = getStorage();
    console.log("Storage configuration:", {
      bucket: storageInstance.app.options.storageBucket,
      projectId: storageInstance.app.options.projectId
    });
    
    // Create a simple reference for a text file with timestamp
    const timestamp = Date.now();
    const filename = `test-${timestamp}.txt`;
    console.log("Creating reference for:", filename);
    const testRef = ref(storage, filename);
    
    console.log("Storage reference info:", {
      fullPath: testRef.fullPath,
      bucket: testRef.bucket,
      name: testRef.name
    });
    
    // Simple string upload with minimal content
    console.log("Attempting minimal string upload...");
    const snapshot = await uploadString(testRef, `This is a test at ${new Date().toISOString()}`);
    
    console.log("Minimal upload succeeded! Metadata:", snapshot.metadata);
    
    // Get the download URL
    const url = await getDownloadURL(testRef);
    console.log("Download URL obtained:", url);
    
    return url;
  } catch (error: any) {
    console.error("Minimal storage test failed:", error);
    
    // Log more detailed error info
    if (error.code) {
      console.error("Error code:", error.code);
    }
    
    if (error.message) {
      console.error("Error message:", error.message);
    }
    
    if (error.serverResponse) {
      console.error("Server response:", error.serverResponse);
    }
    
    return null;
  }
}