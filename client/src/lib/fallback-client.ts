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

// Default project for fallback
const createDefaultFallbackProject = (): Project => {
  const now = Timestamp.now();
  return {
    id: 'default',
    name: 'My Project',
    description: 'Local Project (Firebase Offline)',
    createdAt: now,
    updatedAt: now,
    userId: 'local-user',
    isDefault: true
  };
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

// Function to create an area with the Replit backend
export async function createAreaOnServer(name: string): Promise<Area | null> {
  try {
    const response = await apiRequest('POST', '/api/areas', { name });
    const data = await response.json();
    return convertToFirebaseModel<Area>(data);
  } catch (error) {
    console.error('Error creating area on server:', error);
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