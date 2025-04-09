import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { 
  getUserProjects, 
  getAreasWithPhotos,
  getPhotosByArea,
  getPhotosWithTagCount,
  getPhotoWithTags,
  Project,
  Area,
  AreaWithPhotos,
  Photo,
  PhotoWithTags,
  Tag
} from "../lib/firestore";
import { where } from "firebase/firestore";

// Generic hook for fetching data with loading and error states
function useFirebaseData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
): {
  data: T | null;
  isLoading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await fetchFn();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        
        if (isMounted) {
          // Convert to Error type for easier access to properties
          const error = err as Error;
          const errorMessage = error.message || "Unknown error";
          
          // Check for connectivity issues (looking for specific error messages)
          const isConnectivityIssue = 
            errorMessage.includes("unavailable") || 
            errorMessage.includes("network") || 
            errorMessage.includes("connection");
          
          if (isConnectivityIssue && retryCount < maxRetries) {
            // If it seems like a connectivity issue, retry
            retryCount++;
            console.log(`Connection issue. Retrying (${retryCount}/${maxRetries})...`);
            
            // Wait a moment and try again
            setTimeout(fetchData, 1500);
            return; // Skip setting error state
          }
          
          // Set error state
          setError(errorMessage);
          
          // Show a toast with appropriate message
          toast({
            title: isConnectivityIssue ? "Connection Issue" : "Error",
            description: isConnectivityIssue 
              ? "Could not connect to the database. Some features may be limited." 
              : errorMessage,
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  
  return { data, isLoading, error };
}

// Hook for fetching user's projects
export function useProjects() {
  const { user } = useAuth();
  
  return useFirebaseData<Project[]>(
    async () => {
      if (!user) return [];
      return await getUserProjects(user.uid);
    },
    [user?.uid]
  );
}

// Hook for fetching areas with photo counts
export function useAreas(projectId: string) {
  const { user } = useAuth();
  
  return useFirebaseData<AreaWithPhotos[]>(
    async () => {
      if (!user || !projectId) return [];
      return await getAreasWithPhotos(projectId, user.uid);
    },
    [projectId, user?.uid]
  );
}

// Hook for fetching photos by area
export function usePhotosByArea(projectId: string, areaId: string) {
  return useFirebaseData<Photo[]>(
    async () => {
      if (!projectId || !areaId) return [];
      return await getPhotosByArea(projectId, areaId);
    },
    [projectId, areaId]
  );
}

// Hook for fetching all photos in a project
export function useAllPhotos(projectId: string) {
  const { user } = useAuth();
  
  return useFirebaseData<PhotoWithTags[]>(
    async () => {
      if (!user || !projectId) return [];
      return await getPhotosWithTagCount(projectId, [where("userId", "==", user.uid)]);
    },
    [projectId, user?.uid]
  );
}

// Hook for fetching a single photo with its tags
export function usePhotoWithTags(projectId: string, photoId: string) {
  return useFirebaseData<{ photo: Photo, tags: Tag[] } | null>(
    async () => {
      if (!projectId || !photoId) return null;
      return await getPhotoWithTags(projectId, photoId);
    },
    [projectId, photoId]
  );
}

// Hook for fetching the default project
export function useDefaultProject() {
  const { user } = useAuth();
  
  return useFirebaseData<Project | null>(
    async () => {
      if (!user) return null;
      
      const projects = await getUserProjects(user.uid);
      return projects.find(project => project.isDefault) || (projects.length > 0 ? projects[0] : null);
    },
    [user?.uid]
  );
}