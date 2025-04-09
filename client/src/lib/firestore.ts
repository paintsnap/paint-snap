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
  // Check if the user already has a default project
  const projectsRef = getProjectsRef();
  const q = query(
    projectsRef, 
    where("userId", "==", user.uid),
    where("isDefault", "==", true)
  );
  
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    // User already has a default project
    return convertDoc<Project>(querySnapshot.docs[0]);
  }
  
  // Create a new default project
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
  
  return {
    id: newProjectRef.id,
    ...projectData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const projectsRef = getProjectsRef();
  const q = query(
    projectsRef, 
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Project>(doc));
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
  const photosRef = getPhotosRef(projectId);
  const q = query(photosRef, ...constraints, orderBy("uploadDate", "desc"));
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Photo>(doc));
}

export async function getPhotosByArea(projectId: string, areaId: string): Promise<Photo[]> {
  return getPhotos(projectId, [where("areaId", "==", areaId)]);
}

export async function getPhotosByUser(projectId: string, userId: string): Promise<Photo[]> {
  return getPhotos(projectId, [where("userId", "==", userId)]);
}

export async function getPhotosWithTagCount(projectId: string, constraints: QueryConstraint[] = []): Promise<PhotoWithTags[]> {
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
      const area = await getArea(projectId, photo.areaId);
      if (area) {
        areaName = area.name;
        areaCache[photo.areaId] = areaName;
      }
    }
    
    // Count tags
    const tagsRef = getTagsRef(projectId, photo.id);
    const tagsSnapshot = await getDocs(tagsRef);
    
    photosWithTags.push({
      ...photo,
      tagCount: tagsSnapshot.size,
      areaName
    });
  }
  
  return photosWithTags;
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
  const photo = await getPhoto(projectId, photoId);
  if (!photo) {
    return null;
  }
  
  const tagsRef = getTagsRef(projectId, photoId);
  const q = query(tagsRef, orderBy("createdAt"));
  const tagsSnapshot = await getDocs(q);
  const tags = tagsSnapshot.docs.map(doc => convertDoc<Tag>(doc));
  
  return { photo, tags };
}

export async function uploadPhoto(
  projectId: string, 
  areaId: string, 
  userId: string, 
  file: File, 
  name: string = ""
): Promise<Photo> {
  // Resize image before upload
  const resizedImage = await resizeImage(file, 1200, 1200, 0.8);
  
  // Generate a unique filename
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = `users/${userId}/projects/${projectId}/photos/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  // Upload to Firebase Storage
  await uploadBytes(storageRef, resizedImage);
  const imageUrl = await getDownloadURL(storageRef);
  
  // Create photo document in Firestore
  const photosRef = getPhotosRef(projectId);
  const now = serverTimestamp();
  const photoData = {
    name: name || file.name,
    areaId,
    projectId,
    userId,
    imageUrl,
    storagePath,
    uploadDate: now,
    lastModified: now
  };
  
  const newPhotoRef = doc(photosRef);
  await setDoc(newPhotoRef, photoData);
  
  return {
    id: newPhotoRef.id,
    ...photoData,
    uploadDate: Timestamp.now(),
    lastModified: Timestamp.now(),
  };
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
  const tagsRef = getTagsRef(projectId, photoId);
  const q = query(tagsRef, orderBy("createdAt"));
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Tag>(doc));
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
    // Resize tag image
    const resizedImage = await resizeImage(tagImage, 800, 800, 0.8);
    
    // Generate a unique filename
    const fileName = `${Date.now()}_${tagImage.name}`;
    tagStoragePath = `users/${userId}/projects/${projectId}/photos/${photoId}/tags/${fileName}`;
    const storageRef = ref(storage, tagStoragePath);
    
    // Upload to Firebase Storage
    await uploadBytes(storageRef, resizedImage);
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
    
    // Resize tag image
    const resizedImage = await resizeImage(tagImage, 800, 800, 0.8);
    
    // Generate a unique filename
    const fileName = `${Date.now()}_${tagImage.name}`;
    tagStoragePath = `users/${tag.userId}/projects/${projectId}/photos/${photoId}/tags/${fileName}`;
    const storageRef = ref(storage, tagStoragePath);
    
    // Upload to Firebase Storage
    await uploadBytes(storageRef, resizedImage);
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