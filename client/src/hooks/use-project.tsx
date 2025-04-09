import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./use-auth";
import { useDefaultProject } from "./use-firebase-data";
import { Project, createProject, updateProject, deleteProject } from "../lib/firestore";
import { useToast } from "./use-toast";

interface ProjectContextType {
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  createNewProject: (name: string, description?: string) => Promise<Project | null>;
  updateProjectDetails: (projectId: string, name: string, description?: string) => Promise<void>;
  deleteCurrentProject: (projectId: string) => Promise<void>;
  switchProject: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { data: defaultProject, isLoading, error } = useDefaultProject();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { toast } = useToast();

  // When the default project is loaded, set it as the current project
  useEffect(() => {
    if (defaultProject && !currentProject) {
      setCurrentProject(defaultProject);
    }
  }, [defaultProject, currentProject]);

  const createNewProject = async (name: string, description?: string): Promise<Project | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a project",
        variant: "destructive"
      });
      return null;
    }

    try {
      const newProject = await createProject(user.uid, name, description);
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      return newProject;
    } catch (error: any) {
      console.error("Error creating project:", error);
      
      // Special handling for security rules issues
      if (error.code === 'permission-denied') {
        // Suggest Firebase security rules
        console.error(`
⚠️ FIREBASE SECURITY RULES ISSUE ⚠️
==================================

Your Firebase security rules need to be updated to allow writing to the 'projects' collection.
Go to the Firebase Console > Firestore Database > Rules and use these rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /projects/{projectId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      
      match /areas/{areaId} {
        allow read, write: if request.auth != null && get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid;
      }
      
      match /photos/{photoId} {
        allow read, write: if request.auth != null && get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid;
        
        match /tags/{tagId} {
          allow read, write: if request.auth != null && get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid;
        }
      }
    }
  }
}
`);
        
        toast({
          title: "Security Rules Issue",
          description: "Your Firebase security rules need to be updated. See console for details.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create project: " + (error.message || "Unknown error"),
          variant: "destructive"
        });
      }
      return null;
    }
  };

  const updateProjectDetails = async (projectId: string, name: string, description?: string): Promise<void> => {
    try {
      await updateProject(projectId, name, description);
      
      // Update the current project if it's the one being updated
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject({
          ...currentProject,
          name,
          description: description || currentProject.description
        });
      }
      
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteCurrentProject = async (projectId: string): Promise<void> => {
    try {
      await deleteProject(projectId);
      
      // If the current project was deleted, set to null
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(null);
      }
      
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      });
      throw error;
    }
  };

  const switchProject = (projectId: string) => {
    if (currentProject && currentProject.id === projectId) {
      return; // Already on this project
    }

    // This just changes the local state, fetching the actual project details
    // will happen via the useProjects hook or related hooks in the components
    setCurrentProject({
      ...currentProject,
      id: projectId,
    } as Project);
  };

  return (
    <ProjectContext.Provider value={{
      currentProject,
      isLoading,
      error,
      createNewProject,
      updateProjectDetails,
      deleteCurrentProject,
      switchProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};