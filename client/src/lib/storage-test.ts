import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

// Test function to check if Firebase Storage uploads work
export async function testStorageUpload(projectId: string, userId: string, file: File): Promise<string> {
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
    
    // Upload the file
    console.log("Attempting to upload file...");
    const snapshot = await uploadBytes(storageRef, file);
    console.log("Upload completed successfully:", snapshot);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Download URL obtained:", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Error in storage upload test:", error);
    throw error;
  }
}