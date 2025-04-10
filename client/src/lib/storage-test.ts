import { ref, uploadBytes, uploadString, getDownloadURL, getStorage } from "firebase/storage";
import { storage } from "./firebase";
import { getAuth } from "firebase/auth";

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
    // Log the auth state
    const auth = getAuth();
    console.log("Auth state:", {
      isLoggedIn: !!auth.currentUser,
      userId: auth.currentUser?.uid
    });
    
    // Log Firebase Storage configuration
    console.log("Firebase Storage configuration:", {
      bucket: storage.app.options.storageBucket,
      appName: storage.app.name,
      projectId: storage.app.options.projectId
    });
    
    console.log("Starting storage upload test for:", {
      projectId, userId, fileName: file.name, fileSize: file.size
    });
    
    // First try a super simple string upload to test connectivity
    console.log("First trying a simple string upload...");
    const textStoragePath = `test/string_${Date.now()}.txt`;
    const textRef = ref(storage, textStoragePath);
    
    try {
      // Simple text upload with short timeout
      const textTimeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error("Text upload timed out"));
        }, 5000);
      });
      
      const textSnapshot = await Promise.race([
        uploadString(textRef, "This is a simple text test"),
        textTimeoutPromise
      ]);
      
      console.log("Text upload succeeded!", textSnapshot);
    } catch (textError) {
      console.error("Simple text upload failed:", textError);
    }
    
    // Create a reference to the storage location for image
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `uploads/${projectId}/test/${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, filePath);
    
    console.log("Storage reference created:", filePath);
    console.log("Full storage path:", storageRef.fullPath);
    console.log("Storage bucket:", storageRef.bucket);
    
    // Get a small slice of the file for testing (first 10KB)
    const testSlice = file.size > 10240 ? file.slice(0, 10240) : file;
    console.log("Created test slice of file:", testSlice.size, "bytes");
    
    // Add metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        projectId: projectId,
        testUpload: "true"
      }
    };
    
    // Upload the file with timeout
    console.log("Attempting to upload file...");
    
    // Race between upload and timeout
    const snapshot = await Promise.race([
      uploadBytes(storageRef, testSlice, metadata),
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

rules_version = '2';
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
      console.error("Upload timed out. Network connectivity issues or Firebase Storage rules may be blocking access.");
      error.message = "Upload timed out. This could be due to network connectivity issues or Firebase Storage rules.";
    } else if (error.code === 'storage/quota-exceeded') {
      error.message = "Storage quota exceeded. Please check your Firebase plan.";
    } else if (error.code === 'storage/invalid-argument') {
      error.message = "Invalid storage argument. Storage bucket may be misconfigured.";
      console.error("Storage bucket appears to be misconfigured. Current configuration:", storage.app.options.storageBucket);
    } else if (error.code === 'storage/bucket-not-found') {
      error.message = "Storage bucket not found. Please verify the bucket name in Firebase configuration.";
      console.error("Could not find storage bucket:", storage.app.options.storageBucket);
    } else if (error.code === 'storage/retry-limit-exceeded') {
      error.message = "Network issues prevented the upload. Firebase Storage may be unreachable from this environment.";
      console.error("Network connectivity issue or Firebase Storage is unreachable.");
    } else if (!error.message) {
      error.message = "Unknown storage error - check browser console for details";
    }
    
    throw error;
  }
}