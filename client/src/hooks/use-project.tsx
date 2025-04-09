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
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
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