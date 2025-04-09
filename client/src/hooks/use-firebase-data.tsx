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
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // For manual refetching
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const refetch = () => {
    setIsLoading(true);
    setError(null);
    setRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3; // Increased max retries
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      // Don't clear error immediately to avoid flickering UI on retries
      
      try {
        const result = await fetchFn();
        if (isMounted) {
          setData(result);
          setError(null); // Clear error on success
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        
        if (isMounted) {
          // Get error details, handling various error formats
          let errorMessage = "Unknown error";
          let errorCode = "";
          
          if (err instanceof Error) {
            errorMessage = err.message;
            // Try to extract code from Firebase errors
            errorCode = (err as any).code || "";
          } else if (typeof err === 'object' && err !== null) {
            errorMessage = (err as any).message || "Unknown error";
            errorCode = (err as any).code || "";
          }
          
          // Check for connectivity issues (looking for specific error messages and codes)
          const isConnectivityIssue = 
            errorMessage.includes("unavailable") || 
            errorMessage.includes("network") || 
            errorMessage.includes("connection") ||
            errorCode === "unavailable" ||
            errorCode === "network-request-failed";
          
          // Retry with exponential backoff for connectivity issues
          if (isConnectivityIssue && retryCount < maxRetries) {
            retryCount++;
            const backoffTime = Math.min(1000 * (2 ** retryCount), 10000); // exponential backoff with max 10s
            console.log(`Connection issue. Retrying (${retryCount}/${maxRetries}) in ${backoffTime}ms...`);
            
            // Show toast for first retry only
            if (retryCount === 1) {
              toast({
                title: "Connection Issue",
                description: "Having trouble connecting. Retrying...",
                variant: "default"
              });
            }
            
            // For quick first retry
            setTimeout(fetchData, backoffTime);
            return; // Skip setting permanent error state
          }
          
          // Set error state
          setError(errorMessage);
          
          // Show a toast with appropriate message only on final failure
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
  }, [...dependencies, refetchTrigger]);
  
  return { data, isLoading, error, refetch };
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
  const { toast } = useToast();
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  const result = useFirebaseData<AreaWithPhotos[]>(
    async () => {
      if (!user || !projectId) return [];
      
      try {
        // First try to get data from Firebase
        const areas = await getAreasWithPhotos(projectId, user.uid);
        setIsUsingFallback(false);
        return areas;
      } catch (error) {
        console.error("Error fetching areas from Firebase, falling back to server:", error);
        
        // If Firebase fails, fallback to Replit database
        setIsUsingFallback(true);
        
        try {
          // Import is inside the function to avoid circular dependencies
          const { fetchAreasFromServer } = await import('../lib/fallback-client');
          const serverAreas = await fetchAreasFromServer();
          
          if (serverAreas.length > 0 && !isUsingFallback) {
            toast({
              title: "Using Local Data",
              description: "Firebase is unavailable. Using local database instead.",
              variant: "default"
            });
          }
          
          return serverAreas;
        } catch (fallbackError) {
          console.error("Error in fallback:", fallbackError);
          throw error; // Throw the original error
        }
      }
    },
    [projectId, user?.uid]
  );
  
  return {
    ...result,
    isUsingFallback
  };
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
  const { toast } = useToast();
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  const result = useFirebaseData<PhotoWithTags[]>(
    async () => {
      if (!user || !projectId) return [];
      
      try {
        // First try to get data from Firebase
        const photos = await getPhotosWithTagCount(projectId, [where("userId", "==", user.uid)]);
        setIsUsingFallback(false);
        return photos;
      } catch (error) {
        console.error("Error fetching photos from Firebase, falling back to server:", error);
        
        // If Firebase fails, fallback to Replit database
        setIsUsingFallback(true);
        
        try {
          // Import is inside the function to avoid circular dependencies
          const { fetchPhotosFromServer } = await import('../lib/fallback-client');
          const serverPhotos = await fetchPhotosFromServer();
          
          if (serverPhotos.length > 0 && !isUsingFallback) {
            toast({
              title: "Using Local Data",
              description: "Firebase is unavailable. Using local database instead.",
              variant: "default"
            });
          }
          
          return serverPhotos;
        } catch (fallbackError) {
          console.error("Error in fallback:", fallbackError);
          throw error; // Throw the original error
        }
      }
    },
    [projectId, user?.uid]
  );
  
  return {
    ...result,
    isUsingFallback
  };
}

// Hook for fetching a single photo with its tags
export function usePhotoWithTags(projectId: string, photoId: string) {
  const { toast } = useToast();
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  const result = useFirebaseData<{ photo: Photo, tags: Tag[] } | null>(
    async () => {
      if (!projectId || !photoId) return null;
      
      try {
        // First try to get data from Firebase
        const photoData = await getPhotoWithTags(projectId, photoId);
        setIsUsingFallback(false);
        return photoData;
      } catch (error) {
        console.error("Error fetching photo with tags from Firebase, trying fallback:", error);
        
        // If Firebase fails, attempt fallback (though this is less complete for individual photos)
        setIsUsingFallback(true);
        
        if (!isUsingFallback) {
          toast({
            title: "Using Local Data",
            description: "Firebase is unavailable. Some photo details may be limited.",
            variant: "default"
          });
        }
        
        // For individual photos, we might have limited fallback options
        throw error; // Still throw since our current fallback doesn't handle individual photos well
      }
    },
    [projectId, photoId]
  );
  
  return {
    ...result,
    isUsingFallback
  };
}

// Hook for fetching the default project
export function useDefaultProject() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  const result = useFirebaseData<Project | null>(
    async () => {
      if (!user) return null;
      
      try {
        // First try to get data from Firebase
        const projects = await getUserProjects(user.uid);
        setIsUsingFallback(false);
        return projects.find(project => project.isDefault) || (projects.length > 0 ? projects[0] : null);
      } catch (error) {
        console.error("Error fetching projects from Firebase, falling back to default:", error);
        
        // If Firebase fails, fallback to local default project
        setIsUsingFallback(true);
        
        try {
          // Import is inside the function to avoid circular dependencies
          const { getDefaultProject } = await import('../lib/fallback-client');
          const defaultProject = await getDefaultProject();
          
          if (!isUsingFallback) {
            toast({
              title: "Using Local Data",
              description: "Firebase is unavailable. Using local project instead.",
              variant: "default"
            });
          }
          
          return defaultProject;
        } catch (fallbackError) {
          console.error("Error in fallback:", fallbackError);
          throw error; // Throw the original error
        }
      }
    },
    [user?.uid]
  );
  
  return {
    ...result,
    isUsingFallback
  };
}