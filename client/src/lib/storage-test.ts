import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

// Test function to check if Firebase Storage uploads work
export async function testStorageUpload(projectId: string, userId: string, file: File): Promise<string> {
  // Create a timeout promise that rejects after 15 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error("Storage upload timed out after 15 seconds. Firebase Storage rules may be blocking access."));
    }, 15000);
  });
  
  try {
    console.log("Starting storage upload test for:", {
      projectId, userId, fileName: file.name, fileSize: file.size
    });
    
    // Create a reference to the storage location
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `uploads/${projectId}/test/${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, filePath);
    
    console.log("Storage reference created:", filePath);
    
    // Get a small slice of the file for testing (first 10KB)
    const testSlice = file.size > 10240 ? file.slice(0, 10240) : file;
    console.log("Created test slice of file:", testSlice.size, "bytes");
    
    // Upload the file with timeout
    console.log("Attempting to upload file...");
    
    // Race between upload and timeout
    const snapshot = await Promise.race([
      uploadBytes(storageRef, testSlice),
      timeoutPromise
    ]);
    
    console.log("Upload completed successfully:", snapshot);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Download URL obtained:", downloadURL);
    
    return downloadURL;
  } catch (error: any) {
    console.error("Error in storage upload test:", error);
    
    // Add specific error messages for common Firebase Storage issues
    if (error.code === 'storage/unauthorized') {
      console.error(`
IMPORTANT: Your Firebase Storage rules need to be updated!
Current rules are preventing uploads. Please add these rules in your Firebase console:

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
      `);
      error.message = "Storage access denied. Firebase Storage rules need to be updated to allow uploads.";
    } else if (error.message && error.message.includes('timed out')) {
      console.error("Upload timed out. This usually indicates a permissions issue with Firebase Storage rules.");
    } else if (error.code === 'storage/quota-exceeded') {
      error.message = "Storage quota exceeded. Please check your Firebase plan.";
    } else if (!error.message) {
      error.message = "Unknown storage error - check browser console for details";
    }
    
    throw error;
  }
}