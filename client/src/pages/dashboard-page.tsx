import { useEffect } from "react";
import { useLocation } from "wouter";
import { Camera } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/hooks/use-project";
import { useAreas } from "@/hooks/use-firebase-data";

export default function DashboardPage() {
  const { isLoading: authLoading } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [, setLocation] = useLocation();

  // Fetch areas if we have a current project
  const { 
    data: areas, 
    isLoading: areasLoading 
  } = useAreas(currentProject?.id || "");

  // Redirect to areas page if user has areas
  useEffect(() => {
    if (!authLoading && !projectLoading && !areasLoading) {
      setLocation("/areas");
    }
  }, [authLoading, projectLoading, areasLoading, setLocation]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <Camera className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-3xl font-bold">Welcome to PaintSnap</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Redirecting to your areas...
        </p>
      </div>
    </div>
  );
}