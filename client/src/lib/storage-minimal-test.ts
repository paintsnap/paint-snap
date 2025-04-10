import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

// Ultra-minimal test for Firebase Storage connectivity
export async function testMinimalUpload(): Promise<string | null> {
  try {
    console.log("=== MINIMAL STORAGE TEST ===");
    console.log("Storage bucket:", storage.app.options.storageBucket);
    
    // Create a simple reference for a text file
    const testRef = ref(storage, `test-${Date.now()}.txt`);
    
    // Simple string upload with minimal content
    console.log("Attempting minimal string upload...");
    const snapshot = await uploadString(testRef, "Test content");
    
    console.log("Minimal upload succeeded!");
    
    // Get the download URL
    const url = await getDownloadURL(testRef);
    console.log("Download URL obtained:", url);
    
    return url;
  } catch (error) {
    console.error("Minimal storage test failed:", error);
    return null;
  }
}