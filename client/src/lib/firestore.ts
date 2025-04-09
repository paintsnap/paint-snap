// Firestore database services
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  CollectionReference,
  DocumentReference,
  DocumentData,
  limit,
  QueryConstraint
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  uploadString,
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { db, storage, resizeImage } from "./firebase";
import { User } from "firebase/auth";
import { createAreaInLocalStorage } from './fallback-client';

// Collection names
const COLLECTIONS = {
  USERS: "users",
  PROJECTS: "projects",
  AREAS: "areas",
  PHOTOS: "photos",
  TAGS: "tags",
};

// Interface definitions
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
  isDefault?: boolean;
}

export interface Area {
  id: string;
  name: string;
  projectId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
}

export interface Photo {
  id: string;
  name: string;
  areaId: string;
  projectId: string;
  userId: string;
  imageUrl: string;
  storagePath: string;
  uploadDate: Timestamp;
  lastModified: Timestamp;
}

export interface Tag {
  id: string;
  photoId: string;
  userId: string;
  description: string;
  details?: string;
  notes?: string;
  tagImageUrl?: string;
  tagStoragePath?: string;
  positionX: number; // percentage (0-100)
  positionY: number; // percentage (0-100)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AreaWithPhotos extends Area {
  photoCount: number;
  latestPhotoUrl?: string;
}

export interface PhotoWithTags extends Photo {
  tagCount: number;
  areaName?: string;
}

// Helper functions
function getProjectsRef(): CollectionReference {
  return collection(db, COLLECTIONS.PROJECTS);
}

function getAreasRef(projectId: string): CollectionReference {
  return collection(db, COLLECTIONS.PROJECTS, projectId, COLLECTIONS.AREAS);
}

function getPhotosRef(projectId: string): CollectionReference {
  return collection(db, COLLECTIONS.PROJECTS, projectId, COLLECTIONS.PHOTOS);
}

function getTagsRef(projectId: string, photoId: string): CollectionReference {
  return collection(
    db, 
    COLLECTIONS.PROJECTS, 
    projectId, 
    COLLECTIONS.PHOTOS, 
    photoId, 
    COLLECTIONS.TAGS
  );
}

// Convert Firestore document to type
function convertDoc<T>(doc: DocumentData): T {
  return {
    id: doc.id,
    ...doc.data()
  } as T;
}

// Project service
export async function createDefaultProject(user: User): Promise<Project> {
  try {
    // Try a simple query first to see if user has any projects
    const projectsRef = getProjectsRef();
    const simpleQuery = query(
      projectsRef,
      where("userId", "==", user.uid)
    );
    
    const simpleSnapshot = await getDocs(simpleQuery);
    
    // If user has any projects, look for the default one or use the first one
    if (!simpleSnapshot.empty) {
      const defaultProject = simpleSnapshot.docs.find(doc => doc.data().isDefault === true);
      if (defaultProject) {
        return convertDoc<Project>(defaultProject);
      }
      
      // If no default project but user has projects, mark the first one as default
      const firstProject = simpleSnapshot.docs[0];
      const projectId = firstProject.id;
      await updateDoc(doc(projectsRef, projectId), { isDefault: true });
      
      return {
        ...convertDoc<Project>(firstProject),
        isDefault: true
      };
    }
    
    // No projects found, create a new default project
    const now = serverTimestamp();
    const projectData = {
      name: "My Project",
      description: "My first project",
      createdAt: now,
      updatedAt: now,
      userId: user.uid,
      isDefault: true
    };
    
    const newProjectRef = doc(projectsRef);
    await setDoc(newProjectRef, projectData);
    
    const newProject = {
      id: newProjectRef.id,
      ...projectData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    console.log("Default project created for new user:", newProject.id);
    return newProject;
  } catch (error) {
    console.error("Error creating default project:", error);
    
    // Create a simple project with minimal operations if there's an index error
    if ((error as any).code === 'failed-precondition') {
      console.warn("Index error when creating default project, using simplified approach");
      
      const projectsRef = getProjectsRef();
      const projectData = {
        name: "My Project",
        description: "My first project",
        userId: user.uid,
        isDefault: true
      };
      
      const newProjectRef = doc(projectsRef);
      await setDoc(newProjectRef, projectData);
      
      return {
        id: newProjectRef.id,
        ...projectData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    }
    
    throw error;
  }
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const projectsRef = getProjectsRef();
    
    // Try first with the compound query (requires an index)
    try {
      const q = query(
        projectsRef, 
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => convertDoc<Project>(doc));
    } catch (error: any) {
      // If the error is about an index, try a simpler query without orderBy
      if (error.code === 'failed-precondition') {
        console.warn("Firestore index not available, falling back to simple query without ordering");
        const simpleQuery = query(
          projectsRef, 
          where("userId", "==", userId)
        );
        
        const querySnapshot = await getDocs(simpleQuery);
        return querySnapshot.docs.map(doc => convertDoc<Project>(doc));
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return []; // Return empty array instead of failing
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  const projectRef = doc(getProjectsRef(), projectId);
  const projectDoc = await getDoc(projectRef);
  
  if (!projectDoc.exists()) {
    return null;
  }
  
  return convertDoc<Project>(projectDoc);
}

export async function createProject(userId: string, name: string, description?: string): Promise<Project> {
  const projectsRef = getProjectsRef();
  const now = serverTimestamp();
  const projectData = {
    name,
    description,
    createdAt: now,
    updatedAt: now,
    userId,
    isDefault: false
  };
  
  const newProjectRef = doc(projectsRef);
  await setDoc(newProjectRef, projectData);
  
  return {
    id: newProjectRef.id,
    ...projectData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export async function updateProject(projectId: string, name: string, description?: string): Promise<void> {
  const projectRef = doc(getProjectsRef(), projectId);
  await updateDoc(projectRef, {
    name,
    description,
    updatedAt: serverTimestamp()
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  // Delete all areas, photos, and tags first
  const areasRef = getAreasRef(projectId);
  const areasSnapshot = await getDocs(areasRef);
  
  // Delete all areas
  for (const areaDoc of areasSnapshot.docs) {
    await deleteArea(projectId, areaDoc.id);
  }
  
  // Delete project document
  const projectRef = doc(getProjectsRef(), projectId);
  await deleteDoc(projectRef);
}

// Area service
export async function getAreas(projectId: string): Promise<Area[]> {
  const areasRef = getAreasRef(projectId);
  const q = query(areasRef, orderBy("name"));
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Area>(doc));
}

export async function getAreasWithPhotos(projectId: string, userId: string): Promise<AreaWithPhotos[]> {
  const areasRef = getAreasRef(projectId);
  const q = query(areasRef, where("userId", "==", userId), orderBy("name"));
  
  const querySnapshot = await getDocs(q);
  const areas = querySnapshot.docs.map(doc => convertDoc<Area>(doc));
  
  // Get photo counts and latest photo for each area
  const areasWithPhotos: AreaWithPhotos[] = [];
  
  for (const area of areas) {
    const photosRef = getPhotosRef(projectId);
    const photosQuery = query(
      photosRef,
      where("areaId", "==", area.id),
      orderBy("uploadDate", "desc"),
      limit(1)
    );
    
    const photosSnapshot = await getDocs(photosQuery);
    const photoCount = photosSnapshot.size;
    let latestPhotoUrl = undefined;
    
    if (photoCount > 0) {
      const latestPhoto = convertDoc<Photo>(photosSnapshot.docs[0]);
      latestPhotoUrl = latestPhoto.imageUrl;
    }
    
    areasWithPhotos.push({
      ...area,
      photoCount,
      latestPhotoUrl
    });
  }
  
  return areasWithPhotos;
}

export async function getArea(projectId: string, areaId: string): Promise<Area | null> {
  const areaRef = doc(getAreasRef(projectId), areaId);
  const areaDoc = await getDoc(areaRef);
  
  if (!areaDoc.exists()) {
    return null;
  }
  
  return convertDoc<Area>(areaDoc);
}

// Using createAreaInLocalStorage from import at the top of the file

export async function createArea(projectId: string, userId: string, name: string): Promise<Area> {
  try {
    const areasRef = getAreasRef(projectId);
    const now = serverTimestamp();
    const areaData = {
      name,
      projectId,
      userId,
      createdAt: now,
      updatedAt: now
    };
    
    const newAreaRef = doc(areasRef);
    await setDoc(newAreaRef, areaData);
    
    return {
      id: newAreaRef.id,
      ...areaData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  } catch (error) {
    console.error("Error creating area in Firestore:", error);
    
    // If Firestore is unavailable, use local storage fallback
    const firebaseError = error as any;
    if (firebaseError.code === 'unavailable' || firebaseError.code === 'permission-denied') {
      console.log("Firestore unavailable, using local storage fallback");
      return await createAreaInLocalStorage(name, userId, projectId);
    }
    
    throw error;
  }
}

export async function updateArea(projectId: string, areaId: string, name: string): Promise<void> {
  const areaRef = doc(getAreasRef(projectId), areaId);
  await updateDoc(areaRef, {
    name,
    updatedAt: serverTimestamp()
  });
}

export async function deleteArea(projectId: string, areaId: string): Promise<void> {
  // Delete all photos in the area first
  const photosRef = getPhotosRef(projectId);
  const q = query(photosRef, where("areaId", "==", areaId));
  const photosSnapshot = await getDocs(q);
  
  // Delete all photos
  for (const photoDoc of photosSnapshot.docs) {
    await deletePhoto(projectId, photoDoc.id);
  }
  
  // Delete area document
  const areaRef = doc(getAreasRef(projectId), areaId);
  await deleteDoc(areaRef);
}

// Photo service
export async function getPhotos(projectId: string, constraints: QueryConstraint[] = []): Promise<Photo[]> {
  try {
    const photosRef = getPhotosRef(projectId);
    const q = query(photosRef, ...constraints, orderBy("uploadDate", "desc"));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertDoc<Photo>(doc));
  } catch (error) {
    console.error("Error fetching photos:", error);
    
    // If the error is related to indexing, log a helpful message with clear instructions
    if ((error as any).code === 'failed-precondition') {
      // Extract the index creation URL from the error message if available
      const errorMessage = (error as any).message || '';
      const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\/project\/.*\/firestore\/indexes[^"'\s]+)/);
      const indexUrl = indexUrlMatch ? indexUrlMatch[1] : null;
      
      console.error("⚠️ Firestore index required:");
      console.error("=============================");
      console.log("This query requires a Firestore index that needs to be created.");
      console.log("For the photos collection, you need an index with 'uploadDate' in descending order, plus any other fields used in constraints.");
      
      if (indexUrl) {
        console.error("📋 DIRECT INDEX CREATION LINK:");
        console.error("------------------------------");
        console.error(indexUrl);
        console.error("Copy and paste this URL into your browser to create the required index.");
      } else {
        console.error("To create the index manually:");
        console.error("1. Go to https://console.firebase.google.com/project/" + import.meta.env.VITE_FIREBASE_PROJECT_ID + "/firestore/indexes");
        console.error("2. Click 'Add Index'");
        console.error("3. Select the collection mentioned in the error");
        console.error("4. Add the fields in the correct order with ascending/descending as specified in the error");
        console.error("5. Click 'Create'");
      }
      
      // Try a simpler query without ordering if the original fails
      try {
        console.log("Attempting to fetch photos without ordering as a fallback...");
        const simpleQuery = query(getPhotosRef(projectId));
        const snapshot = await getDocs(simpleQuery);
        return snapshot.docs.map(doc => convertDoc<Photo>(doc));
      } catch (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
      }
    }
    
    // Return empty array on error to prevent app crashing
    return [];
  }
}

export async function getPhotosByArea(projectId: string, areaId: string): Promise<Photo[]> {
  return getPhotos(projectId, [where("areaId", "==", areaId)]);
}

export async function getPhotosByUser(projectId: string, userId: string): Promise<Photo[]> {
  return getPhotos(projectId, [where("userId", "==", userId)]);
}

export async function getPhotosWithTagCount(projectId: string, constraints: QueryConstraint[] = []): Promise<PhotoWithTags[]> {
  try {
    const photos = await getPhotos(projectId, constraints);
    const photosWithTags: PhotoWithTags[] = [];
    
    // Get area names for each photo
    const areaCache: { [areaId: string]: string } = {};
    
    for (const photo of photos) {
      // Get area name (use cache to minimize Firestore reads)
      let areaName = undefined;
      if (areaCache[photo.areaId]) {
        areaName = areaCache[photo.areaId];
      } else {
        try {
          const area = await getArea(projectId, photo.areaId);
          if (area) {
            areaName = area.name;
            areaCache[photo.areaId] = areaName;
          }
        } catch (error) {
          console.error(`Error fetching area for photo ${photo.id}:`, error);
          // Continue with undefined areaName
        }
      }
      
      // Count tags - handle potential indexing issues
      let tagCount = 0;
      try {
        const tagsRef = getTagsRef(projectId, photo.id);
        const tagsSnapshot = await getDocs(tagsRef);
        tagCount = tagsSnapshot.size;
      } catch (error: any) {
        console.error(`Error counting tags for photo ${photo.id}:`, error);
        
        // If the error is related to indexing, log a helpful message with index URL
        if (error.code === 'failed-precondition') {
          // Extract the index creation URL from the error message if available
          const errorMessage = error.message || '';
          const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\/project\/.*\/firestore\/indexes[^"'\s]+)/);
          const indexUrl = indexUrlMatch ? indexUrlMatch[1] : null;
          
          console.error("⚠️ Firestore index required for tags:");
          console.error("===================================");
          
          if (indexUrl) {
            console.error("📋 DIRECT INDEX CREATION LINK:");
            console.error("------------------------------");
            console.error(indexUrl);
            console.error("Copy and paste this URL into your browser to create the required index.");
          } else {
            console.error("To create the index manually:");
            console.error("1. Go to https://console.firebase.google.com/project/" + import.meta.env.VITE_FIREBASE_PROJECT_ID + "/firestore/indexes");
            console.error("2. Click 'Add Index'");
            console.error("3. Select the 'tags' collection");
            console.error("4. Add 'photoId' (ascending) and 'createdAt' (ascending) fields");
            console.error("5. Click 'Create'");
          }
        }
      }
      
      photosWithTags.push({
        ...photo,
        tagCount,
        areaName
      });
    }
    
    return photosWithTags;
  } catch (error) {
    console.error("Error getting photos with tag count:", error);
    
    // If the error is related to indexing, log a helpful message with index URL
    if ((error as any).code === 'failed-precondition') {
      // Extract the index creation URL from the error message if available
      const errorMessage = (error as any).message || '';
      const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\/project\/.*\/firestore\/indexes[^"'\s]+)/);
      const indexUrl = indexUrlMatch ? indexUrlMatch[1] : null;
      
      console.error("⚠️ Firestore index required for complex query:");
      console.error("===========================================");
      
      if (indexUrl) {
        console.error("📋 DIRECT INDEX CREATION LINK:");
        console.error("------------------------------");
        console.error(indexUrl);
        console.error("Copy and paste this URL into your browser to create the required index.");
      } else {
        console.error("To create the index manually:");
        console.error("1. Go to https://console.firebase.google.com/project/" + import.meta.env.VITE_FIREBASE_PROJECT_ID + "/firestore/indexes");
        console.error("2. Click 'Add Index'");
        console.error("3. Select the collection mentioned in the error");
        console.error("4. Add the fields in the correct order with ascending/descending as specified in the error");
        console.error("5. Click 'Create'");
      }
    }
    
    // Return empty array on error to prevent app crashing
    return [];
  }
}

export async function getPhoto(projectId: string, photoId: string): Promise<Photo | null> {
  const photoRef = doc(getPhotosRef(projectId), photoId);
  const photoDoc = await getDoc(photoRef);
  
  if (!photoDoc.exists()) {
    return null;
  }
  
  return convertDoc<Photo>(photoDoc);
}

export async function getPhotoWithTags(projectId: string, photoId: string): Promise<{ photo: Photo, tags: Tag[] } | null> {
  try {
    const photo = await getPhoto(projectId, photoId);
    if (!photo) {
      return null;
    }
    
    let tags: Tag[] = [];
    try {
      const tagsRef = getTagsRef(projectId, photoId);
      const q = query(tagsRef, orderBy("createdAt"));
      const tagsSnapshot = await getDocs(q);
      tags = tagsSnapshot.docs.map(doc => convertDoc<Tag>(doc));
    } catch (error) {
      console.error("Error fetching tags for photo:", error);
      
      // If the error is related to indexing, log a helpful message with index URL
      if ((error as any).code === 'failed-precondition') {
        // Extract the index creation URL from the error message if available
        const errorMessage = (error as any).message || '';
        const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\/project\/.*\/firestore\/indexes[^"'\s]+)/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[1] : null;
        
        console.error("⚠️ Firestore index required for tags query:");
        console.error("======================================");
        
        if (indexUrl) {
          console.error("📋 DIRECT INDEX CREATION LINK:");
          console.error("------------------------------");
          console.error(indexUrl);
          console.error("Copy and paste this URL into your browser to create the required index.");
        } else {
          console.error("To create the index manually:");
          console.error("1. Go to https://console.firebase.google.com/project/" + import.meta.env.VITE_FIREBASE_PROJECT_ID + "/firestore/indexes");
          console.error("2. Click 'Add Index'");
          console.error("3. Select the 'tags' collection");
          console.error("4. Add 'createdAt' (ascending) field");
          console.error("5. Click 'Create'");
        }
      }
    }
    
    return { photo, tags };
  } catch (error) {
    console.error("Error in getPhotoWithTags:", error);
    
    // If this is a permission error, especially in initial usage, return null
    // to allow graceful handling in the UI
    return null;
  }
}

export async function uploadPhoto(
  projectId: string,
  photoData: {
    userId: string,
    areaId: string,
    name: string,
    file: File
  }
): Promise<string> {
  const { userId, areaId, name, file } = photoData;
  
  try {
    console.log("Starting upload process for:", {
      projectId, userId, areaId, fileName: file.name, fileSize: file.size
    });
    
    // Log permissions before attempting upload
    await logFirebasePermissions();
    
    console.log("Preparing minimal image for upload...");
    
    // Create a smaller image for more reliable upload
    const img = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set up a promise to load the image
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // Scale the image down to a reasonable size
        const MAX_DIMENSION = 600;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        
        // Set canvas size and draw image
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        resolve();
      };
      img.onerror = reject;
      
      // Create a blob URL from the file
      img.src = URL.createObjectURL(file);
    });
    
    // Convert canvas to blob (jpeg) with very low quality
    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.3); // 30% quality
    });
    
    if (!optimizedBlob) {
      throw new Error("Failed to create optimized image for upload");
    }
    
    console.log("Image optimized for upload:", { 
      originalSize: file.size, 
      optimizedSize: optimizedBlob.size,
      reduction: `${Math.round((1 - optimizedBlob.size / file.size) * 100)}%` 
    });
    
    // Generate a simple filename with no special chars
    const fileName = `photo_${Date.now()}.jpg`;
    const storagePath = `photos/${fileName}`;  // Simplified path structure
    console.log("Using simplified storage path:", storagePath);
    
    // Get storage reference with the simplified path
    const storageRef = ref(storage, storagePath);
    console.log("Storage reference created for path:", storagePath);
    
    try {
      // Simple direct upload attempt with minimal metadata
      console.log("Starting direct upload attempt...");
      const metadata = {
        contentType: 'image/jpeg'
      };
      
      // Upload the file to Firebase Storage directly
      console.log("About to upload file to Firebase Storage directly...");
      let uploadTask;
      
      try {
        // Set a timeout to detect stalled uploads
        const uploadTimeout = setTimeout(() => {
          console.error("UPLOAD TIMEOUT: Upload operation exceeded maximum time limit");
        }, 15000); // 15 seconds timeout
        
        // Log detailed file information
        console.log("File size:", optimizedBlob.size, "bytes");
        console.log("File type: image/jpeg");
        
        // Load Firebase storage with reduced timeout
        console.log("Setting custom maxOperationRetryTime for Firebase upload");
        const firebaseStorage = await import('firebase/storage');
        (firebaseStorage as any)._DEFAULT_MAX_OPERATION_RETRY_TIME = 5000; // 5 seconds max retry
        
        console.log("ATTEMPTING UPLOAD...");
        
        // Try with a simple fetch for upload (using a public bucket if possible)
        try {
          // Try direct upload with optimized blob (not original file)
          uploadTask = await uploadBytes(storageRef, optimizedBlob, metadata);
          console.log("Upload completed successfully via uploadBytes with optimized blob:", uploadTask);
        } catch (directError) {
          console.error("Direct upload failed:", directError);
          
          // Try creating a temporary canvas to reduce the image size
          console.log("Attempting fallback with reduced image size");
          const img = new Image();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Create a promise to load the image
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              // Reduce the image size
              const maxSize = 800;
              let width = img.width;
              let height = img.height;
              
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
              
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
              
              canvas.width = width;
              canvas.height = height;
              
              // Draw the image to canvas
              ctx?.drawImage(img, 0, 0, width, height);
              resolve();
            };
            img.onerror = reject;
            
            // Create a blob URL from the file
            img.src = URL.createObjectURL(file);
          });
          
          // Convert canvas to blob with lower quality
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 0.5);
          });
          
          if (!blob) {
            throw new Error("Failed to create blob from image canvas");
          }
          
          console.log("Created reduced image:", { size: blob.size });
          
          // Try upload again with reduced image
          uploadTask = await uploadBytes(storageRef, blob, {
            ...metadata,
            contentType: 'image/jpeg'
          });
          console.log("Upload completed successfully with reduced image");
        }
        
        clearTimeout(uploadTimeout);
      } catch (error: any) {
        console.error("STORAGE UPLOAD ERROR:", error);
        try {
          console.error("Detailed error:", JSON.stringify(error, null, 2));
        } catch (e) {
          console.error("Could not stringify error", error);
        }
        throw new Error(`Firebase Storage error during direct upload: ${error.message || String(error)}`);
      }
      
      // Get the download URL with better error handling
      console.log("Attempting to get download URL...");
      let imageUrl;
      try {
        imageUrl = await getDownloadURL(storageRef);
        console.log("Download URL obtained:", imageUrl);
      } catch (error: any) {
        console.error("DOWNLOAD URL ERROR:", error);
        throw new Error(`Error getting download URL: ${error.message || String(error)}`);
      }
      
      // Current time for default values if serverTimestamp fails
      const timestamp = new Date().toISOString();
      
      try {
        // Create photo document in Firestore
        const photosRef = getPhotosRef(projectId);
        const now = serverTimestamp();
        const photoDoc = {
          name: name || file.name,
          areaId,
          projectId,
          userId,
          imageUrl,
          storagePath,
          uploadDate: now,
          lastModified: now
        };
        
        console.log("Creating Firestore document...");
        const newPhotoRef = doc(photosRef);
        await setDoc(newPhotoRef, photoDoc);
        console.log("Firestore document created with ID:", newPhotoRef.id);
        
        // Return the ID of the newly created photo
        return newPhotoRef.id;
      } catch (firestoreError: any) {
        console.error("Error writing to Firestore:", firestoreError);
        
        if (firestoreError.code === 'permission-denied') {
          // Generate a local ID since we can't get one from Firestore
          const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          
          console.warn("Firestore permission denied. Using local workaround with ID:", localId);
          console.error(`
IMPORTANT: Your Firebase Firestore security rules need to be updated!
Current rules are preventing writing to the 'projects/${projectId}/photos' collection.

Suggested Firestore Rules:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write all data
    // This is a simple rule for development - you may want to restrict access for production
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // More specific rules if needed:
    // match /users/{userId} {
    //   allow read, write: if request.auth != null && request.auth.uid == userId;
    // }
    // 
    // match /projects/{projectId} {
    //   allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    //   allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    //   
    //   match /{collection}/{docId} {
    //     allow read, write: if request.auth != null;
    //   }
    // }
  }
}
          `);
          
          // Image was uploaded successfully even though we couldn't record it in Firestore
          // Throw an error with photoId to let the client know about the partial success
          const firestoreError = new Error("Failed to save photo metadata to database. Image was uploaded but database record could not be created.");
          (firestoreError as any).code = 'permission-denied';
          (firestoreError as any).photoId = localId;
          (firestoreError as any).imageUrl = imageUrl;
          throw firestoreError;
        }
        
        throw firestoreError;
      }
    } catch (storageError: any) {
      console.error("Firebase Storage error:", storageError);
      if (storageError.code === 'storage/unauthorized') {
        console.error("FIREBASE STORAGE PERMISSION DENIED - Please check your Firebase Storage rules");
        console.error("Suggested Storage Rules:");
        console.error(`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read and write all storage files
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
        `);
      }
      throw storageError;
    }
  } catch (error: any) {
    console.error("Error uploading photo:", error);
    
    // If the error already has a photoId property, it means we had a partial success
    // (Storage upload worked but Firestore failed), so just re-throw it
    if (error.photoId && error.imageUrl) {
      throw error;
    }
    
    // Otherwise wrap the error with a standard message
    const wrappedError = new Error(`Failed to upload photo: ${error.message || "Unknown error"}`);
    wrappedError.name = error.name;
    if (error.code) (wrappedError as any).code = error.code;
    
    throw wrappedError;
  }
}

export async function updatePhoto(projectId: string, photoId: string, name: string): Promise<void> {
  const photoRef = doc(getPhotosRef(projectId), photoId);
  await updateDoc(photoRef, {
    name,
    lastModified: serverTimestamp()
  });
}

export async function movePhoto(projectId: string, photoId: string, newAreaId: string): Promise<void> {
  const photoRef = doc(getPhotosRef(projectId), photoId);
  await updateDoc(photoRef, {
    areaId: newAreaId,
    lastModified: serverTimestamp()
  });
}

export async function deletePhoto(projectId: string, photoId: string): Promise<void> {
  // Get photo to get storage path
  const photo = await getPhoto(projectId, photoId);
  if (!photo) {
    return;
  }
  
  // Delete all tags
  const tagsRef = getTagsRef(projectId, photoId);
  const tagsSnapshot = await getDocs(tagsRef);
  
  for (const tagDoc of tagsSnapshot.docs) {
    await deleteTag(projectId, photoId, tagDoc.id);
  }
  
  // Delete photo from storage
  try {
    const storageRef = ref(storage, photo.storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting photo from storage:", error);
  }
  
  // Delete photo document
  const photoRef = doc(getPhotosRef(projectId), photoId);
  await deleteDoc(photoRef);
}

// Tag service
export async function getTags(projectId: string, photoId: string): Promise<Tag[]> {
  try {
    const tagsRef = getTagsRef(projectId, photoId);
    const q = query(tagsRef, orderBy("createdAt"));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertDoc<Tag>(doc));
  } catch (error) {
    console.error("Error fetching tags:", error);
    
    // If the error is related to indexing, log a helpful message with index URL
    if ((error as any).code === 'failed-precondition') {
      // Extract the index creation URL from the error message if available
      const errorMessage = (error as any).message || '';
      const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\/project\/.*\/firestore\/indexes[^"'\s]+)/);
      const indexUrl = indexUrlMatch ? indexUrlMatch[1] : null;
      
      console.error("⚠️ Firestore index required for fetching tags:");
      console.error("=========================================");
      
      if (indexUrl) {
        console.error("📋 DIRECT INDEX CREATION LINK:");
        console.error("------------------------------");
        console.error(indexUrl);
        console.error("Copy and paste this URL into your browser to create the required index.");
      } else {
        console.error("To create the index manually:");
        console.error("1. Go to https://console.firebase.google.com/project/" + import.meta.env.VITE_FIREBASE_PROJECT_ID + "/firestore/indexes");
        console.error("2. Click 'Add Index'");
        console.error("3. Select the 'tags' collection");
        console.error("4. Add 'createdAt' (ascending) field");
        console.error("5. Click 'Create'");
      }
    }
    
    // Return empty array on error to prevent app crashing
    return [];
  }
}

export async function getTag(projectId: string, photoId: string, tagId: string): Promise<Tag | null> {
  const tagRef = doc(getTagsRef(projectId, photoId), tagId);
  const tagDoc = await getDoc(tagRef);
  
  if (!tagDoc.exists()) {
    return null;
  }
  
  return convertDoc<Tag>(tagDoc);
}

export async function createTag(
  projectId: string, 
  photoId: string, 
  userId: string,
  description: string,
  details: string = "",
  notes: string = "",
  positionX: number, 
  positionY: number,
  tagImage?: File
): Promise<Tag> {
  const tagsRef = getTagsRef(projectId, photoId);
  const now = serverTimestamp();
  
  // Handle tag image if provided
  let tagImageUrl = undefined;
  let tagStoragePath = undefined;
  
  if (tagImage) {
    // Resize tag image for better upload performance
    const resizedImage = await resizeImage(tagImage, 800, 800, 0.7);
    
    // Generate a unique filename
    const fileName = `${Date.now()}_${tagImage.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    tagStoragePath = `users/${userId}/projects/${projectId}/photos/${photoId}/tags/${fileName}`;
    const storageRef = ref(storage, tagStoragePath);
    
    try {
      // Convert Blob to base64 for more reliable uploads
      const fileReader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        fileReader.onload = () => {
          const base64String = fileReader.result as string;
          // Remove the data URL prefix
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        fileReader.onerror = reject;
        fileReader.readAsDataURL(resizedImage);
      });
      
      const base64Data = await base64Promise;
      
      // Upload using a string instead of bytes for better reliability
      const metadata = {
        contentType: tagImage.type,
      };
      
      await uploadString(storageRef, base64Data, 'base64', metadata);
    } catch (uploadError) {
      console.error("Error uploading tag image with string method:", uploadError);
      // Fall back to direct method if string upload fails
      await uploadBytes(storageRef, resizedImage);
    }
    
    // Get the download URL
    tagImageUrl = await getDownloadURL(storageRef);
  }
  
  const tagData = {
    photoId,
    userId,
    description,
    details,
    notes,
    positionX,
    positionY,
    tagImageUrl,
    tagStoragePath,
    createdAt: now,
    updatedAt: now
  };
  
  const newTagRef = doc(tagsRef);
  await setDoc(newTagRef, tagData);
  
  return {
    id: newTagRef.id,
    ...tagData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export async function updateTag(
  projectId: string, 
  photoId: string, 
  tagId: string,
  description: string,
  details?: string,
  notes?: string,
  positionX?: number,
  positionY?: number,
  tagImage?: File
): Promise<void> {
  const tag = await getTag(projectId, photoId, tagId);
  if (!tag) {
    throw new Error("Tag not found");
  }
  
  // Handle tag image if provided
  let tagImageUrl = tag.tagImageUrl;
  let tagStoragePath = tag.tagStoragePath;
  
  if (tagImage) {
    // Delete old image if exists
    if (tag.tagStoragePath) {
      try {
        const oldStorageRef = ref(storage, tag.tagStoragePath);
        await deleteObject(oldStorageRef);
      } catch (error) {
        console.error("Error deleting old tag image:", error);
      }
    }
    
    // Resize tag image for better upload performance
    const resizedImage = await resizeImage(tagImage, 800, 800, 0.7);
    
    // Generate a unique filename
    const fileName = `${Date.now()}_${tagImage.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    tagStoragePath = `users/${tag.userId}/projects/${projectId}/photos/${photoId}/tags/${fileName}`;
    const storageRef = ref(storage, tagStoragePath);
    
    try {
      // Convert Blob to base64 for more reliable uploads
      const fileReader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        fileReader.onload = () => {
          const base64String = fileReader.result as string;
          // Remove the data URL prefix
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        fileReader.onerror = reject;
        fileReader.readAsDataURL(resizedImage);
      });
      
      const base64Data = await base64Promise;
      
      // Upload using a string instead of bytes for better reliability
      const metadata = {
        contentType: tagImage.type,
      };
      
      await uploadString(storageRef, base64Data, 'base64', metadata);
    } catch (uploadError) {
      console.error("Error uploading tag image with string method:", uploadError);
      // Fall back to direct method if string upload fails
      await uploadBytes(storageRef, resizedImage);
    }
    
    // Get the download URL
    tagImageUrl = await getDownloadURL(storageRef);
  }
  
  // Update tag document
  const tagRef = doc(getTagsRef(projectId, photoId), tagId);
  
  const updateData: any = {
    description,
    updatedAt: serverTimestamp()
  };
  
  if (details !== undefined) updateData.details = details;
  if (notes !== undefined) updateData.notes = notes;
  if (positionX !== undefined) updateData.positionX = positionX;
  if (positionY !== undefined) updateData.positionY = positionY;
  if (tagImageUrl !== undefined) updateData.tagImageUrl = tagImageUrl;
  if (tagStoragePath !== undefined) updateData.tagStoragePath = tagStoragePath;
  
  await updateDoc(tagRef, updateData);
}

export async function deleteTag(projectId: string, photoId: string, tagId: string): Promise<void> {
  // Get tag to delete image if exists
  const tag = await getTag(projectId, photoId, tagId);
  if (tag && tag.tagStoragePath) {
    try {
      const storageRef = ref(storage, tag.tagStoragePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error("Error deleting tag image:", error);
    }
  }
  
  // Delete tag document
  const tagRef = doc(getTagsRef(projectId, photoId), tagId);
  await deleteDoc(tagRef);
}

// Function to log Firebase permissions
export async function logFirebasePermissions() {
  console.log("Checking Firebase permissions...");
  
  try {
    // Log Storage rules
    const testStoragePath = "test.txt";
    const storageRef = ref(storage, testStoragePath);
    console.log("Storage reference created for test path:", testStoragePath);
    
    // Log current user (who would be making the request)
    const { currentUser } = await import('./firebase').then(m => m.auth);
    console.log("Current Firebase user:", currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      emailVerified: currentUser.emailVerified,
      isAnonymous: currentUser.isAnonymous
    } : "No user signed in");
    
    // Log Firestore rules for current user
    if (currentUser) {
      try {
        // Try first with the projects collection which is what we actually need
        try {
          const projectsRef = collection(db, "projects");
          const testProjectDoc = doc(projectsRef, `test_${Date.now()}`);
          await setDoc(testProjectDoc, { 
            testField: "test",
            userId: currentUser.uid,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log("Firestore projects write permission: ALLOWED");
          await deleteDoc(testProjectDoc);
        } catch (projectError) {
          console.log("Firestore projects write permission: DENIED", projectError);
          
          // Fall back to a simple permissions test
          const testDoc = doc(db, `permissions_test/${currentUser.uid}`);
          await setDoc(testDoc, { testField: "test" });
          console.log("Firestore general write permission: ALLOWED");
          await deleteDoc(testDoc);
        }
      } catch (e) {
        console.log("Firestore write permission: DENIED", e);
        console.error("Suggested Firestore Rules:");
        console.error(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all authenticated users to read and write all data
    // This is a simple rule for development - you may want to restrict access for production
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
        `);
      }
    }
  } catch (e) {
    console.error("Error checking Firebase permissions:", e);
  }
}