// Fallback client for when Firebase is unavailable
import { apiRequest } from "./queryClient";
import { 
  Project,
  Area,
  AreaWithPhotos,
  Photo,
  PhotoWithTags,
  Tag
} from "./firestore";
import { Timestamp } from "firebase/firestore";

// Function to convert server-side data to match Firebase models
const convertToFirebaseModel = <T>(data: any): T => {
  // Convert date strings to Firebase Timestamp objects
  if (data && typeof data === 'object') {
    for (const key in data) {
      if (data[key] && typeof data[key] === 'string' && 
          (key.includes('Date') || key.includes('At'))) {
        try {
          // Create a Timestamp object from the date string
          const date = new Date(data[key]);
          data[key] = Timestamp.fromDate(date);
        } catch (e) {
          // Keep the original value if the conversion fails
          console.warn(`Failed to convert date field ${key}`, e);
        }
      } else if (data[key] && typeof data[key] === 'object') {
        // Recursively convert nested objects
        data[key] = convertToFirebaseModel(data[key]);
      }
    }
  }
  return data as T;
};

// Local storage keys
const STORAGE_KEYS = {
  AREAS: 'paintsnap_areas',
  PHOTOS: 'paintsnap_photos',
  TAGS: 'paintsnap_tags',
  PROJECTS: 'paintsnap_projects',
};

// In-memory fallback store
const memoryStore = {
  areas: new Map<string, Area>(),
  photos: new Map<string, Photo>(),
  tags: new Map<string, Tag>(),
  projects: new Map<string, Project>(),
};

// Function to generate a unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Try to load data from localStorage if available
try {
  const savedAreas = localStorage.getItem(STORAGE_KEYS.AREAS);
  if (savedAreas) {
    const areas = JSON.parse(savedAreas);
    areas.forEach((area: any) => {
      // Convert date strings to timestamps
      if (area.createdAt) area.createdAt = Timestamp.fromMillis(area.createdAt.seconds * 1000);
      if (area.updatedAt) area.updatedAt = Timestamp.fromMillis(area.updatedAt.seconds * 1000);
      memoryStore.areas.set(area.id, area);
    });
  }
  
  const savedPhotos = localStorage.getItem(STORAGE_KEYS.PHOTOS);
  if (savedPhotos) {
    const photos = JSON.parse(savedPhotos);
    photos.forEach((photo: any) => {
      if (photo.createdAt) photo.createdAt = Timestamp.fromMillis(photo.createdAt.seconds * 1000);
      if (photo.updatedAt) photo.updatedAt = Timestamp.fromMillis(photo.updatedAt.seconds * 1000);
      memoryStore.photos.set(photo.id, photo);
    });
  }
  
  const savedTags = localStorage.getItem(STORAGE_KEYS.TAGS);
  if (savedTags) {
    const tags = JSON.parse(savedTags);
    tags.forEach((tag: any) => {
      if (tag.createdAt) tag.createdAt = Timestamp.fromMillis(tag.createdAt.seconds * 1000);
      memoryStore.tags.set(tag.id, tag);
    });
  }
  
  const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (savedProjects) {
    const projects = JSON.parse(savedProjects);
    projects.forEach((project: any) => {
      if (project.createdAt) project.createdAt = Timestamp.fromMillis(project.createdAt.seconds * 1000);
      if (project.updatedAt) project.updatedAt = Timestamp.fromMillis(project.updatedAt.seconds * 1000);
      memoryStore.projects.set(project.id, project);
    });
  }
} catch (err) {
  console.error("Error loading from localStorage:", err);
}

// Helper function to save to localStorage
const saveToLocalStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(Array.from(memoryStore.areas.values())));
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(Array.from(memoryStore.photos.values())));
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(Array.from(memoryStore.tags.values())));
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(Array.from(memoryStore.projects.values())));
  } catch (err) {
    console.error("Error saving to localStorage:", err);
  }
};

// Default project for fallback
const createDefaultFallbackProject = (userId: string = "local-user"): Project => {
  // Check if a default project already exists
  const existingProject = Array.from(memoryStore.projects.values())
    .find(project => project.isDefault && project.userId === userId);
  
  if (existingProject) {
    return existingProject;
  }
  
  const now = Timestamp.now();
  const project = {
    id: generateId(),
    name: 'My Project',
    description: 'Local Project (Firebase Offline)',
    createdAt: now,
    updatedAt: now,
    userId: userId,
    isDefault: true
  };
  
  // Add to memory store
  memoryStore.projects.set(project.id, project);
  saveToLocalStorage();
  
  return project;
};

// Function to fetch areas from the Replit backend
export async function fetchAreasFromServer(userId?: string): Promise<AreaWithPhotos[]> {
  try {
    const response = await apiRequest('GET', '/api/areas');
    const data = await response.json();
    return data.map((area: any) => convertToFirebaseModel<AreaWithPhotos>(area));
  } catch (error) {
    console.error('Error fetching areas from server:', error);
    return [];
  }
}

// Function to fetch all photos from the Replit backend
export async function fetchPhotosFromServer(userId?: string, areaId?: string): Promise<PhotoWithTags[]> {
  try {
    const url = areaId ? `/api/areas/${areaId}/photos` : '/api/photos';
    const response = await apiRequest('GET', url);
    const data = await response.json();
    
    return data.map((photo: any) => convertToFirebaseModel<PhotoWithTags>({
      ...photo,
      imageUrl: `/api/photos/${photo.id}/image`,
      tagCount: photo.annotations?.length || 0
    }));
  } catch (error) {
    console.error('Error fetching photos from server:', error);
    return [];
  }
}

// Create area in local storage
export async function createAreaInLocalStorage(name: string, userId: string, projectId: string): Promise<Area> {
  const now = Timestamp.now();
  const area: Area = {
    id: generateId(),
    name,
    projectId,
    userId,
    createdAt: now,
    updatedAt: now
  };
  
  memoryStore.areas.set(area.id, area);
  saveToLocalStorage();
  
  return area;
}

// Function to create an area with the Replit backend, falling back to local storage
export async function createAreaOnServer(name: string, userId?: string, projectId?: string): Promise<Area | null> {
  try {
    const response = await apiRequest('POST', '/api/areas', { name });
    const data = await response.json();
    return convertToFirebaseModel<Area>(data);
  } catch (error) {
    console.error('Error creating area on server:', error);
    
    // Fallback to local storage if we have user ID and project ID
    if (userId && projectId) {
      console.log("Falling back to local storage for area creation");
      return createAreaInLocalStorage(name, userId, projectId);
    }
    return null;
  }
}

// Function to update an area with the Replit backend
export async function updateAreaOnServer(areaId: string, name: string): Promise<boolean> {
  try {
    await apiRequest('PATCH', `/api/areas/${areaId}`, { name });
    return true;
  } catch (error) {
    console.error('Error updating area on server:', error);
    return false;
  }
}

// Function to delete an area with the Replit backend
export async function deleteAreaFromServer(areaId: string): Promise<boolean> {
  try {
    await apiRequest('DELETE', `/api/areas/${areaId}`);
    return true;
  } catch (error) {
    console.error('Error deleting area from server:', error);
    return false;
  }
}

// Fallback default project
export async function getDefaultProject(): Promise<Project> {
  return createDefaultFallbackProject();
}