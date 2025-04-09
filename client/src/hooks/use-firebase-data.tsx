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
  
  // Track number of retries
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      
      try {
        const result = await fetchFn();
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        
        if (isMounted) {
          // Get error details, handling various error formats
          let errorMessage = "Unknown error";
          
          if (err instanceof Error) {
            errorMessage = err.message;
          } else if (typeof err === 'object' && err !== null) {
            errorMessage = (err as any).message || "Unknown error";
          }
          
          // Set error state
          setError(errorMessage);
          
          // Show toast with error message
          toast({
            title: "Error",
            description: errorMessage,
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
  
  return useFirebaseData<AreaWithPhotos[]>(
    async () => {
      if (!user || !projectId) return [];
      const areas = await getAreasWithPhotos(projectId, user.uid);
      return areas;
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
      const photos = await getPhotosWithTagCount(projectId, [where("userId", "==", user.uid)]);
      return photos;
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