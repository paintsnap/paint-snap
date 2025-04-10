import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/hooks/use-project";
import { useAreas } from "@/hooks/use-firebase-data";
import { FirebasePermissionError } from "@/components/firebase-permission-error";
import { Loader2 } from "lucide-react";
import { MetaHelmet } from "@/components/meta-helmet";

export default function DashboardPage() {
  const { isLoading: authLoading } = useAuth();
  const { currentProject, isLoading: projectLoading, error: projectError } = useProject();
  const [hasPermissionError, setHasPermissionError] = useState(false);

  // Fetch areas if we have a current project
  const { isLoading: areasLoading, error: areasError } = useAreas(currentProject?.id || "");

  useEffect(() => {
    // Check for Firebase permission errors
    let projectPermissionDenied = false;
    let areasPermissionDenied = false;
    
    // Check if projectError is a string that contains 'permission-denied'
    if (projectError && typeof projectError === 'string') {
      projectPermissionDenied = projectError.includes('permission-denied');
    }
    
    // Check if areasError is a string that contains 'permission-denied'
    if (areasError && typeof areasError === 'string') {
      areasPermissionDenied = areasError.includes('permission-denied');
    }
    
    if (projectPermissionDenied || areasPermissionDenied) {
      setHasPermissionError(true);
    }
  }, [projectError, areasError]);

  // If we have a permission error, show the dedicated error component
  if (hasPermissionError) {
    return <FirebasePermissionError projectId={import.meta.env.VITE_FIREBASE_PROJECT_ID} />;
  }

  // Just show a blank page during redirect to minimize flickering
  if (!authLoading && !projectLoading && !areasLoading) {
    return <Redirect to="/areas" />;
  }

  // Show a loading indicator while waiting
  return (
    <div className="flex items-center justify-center h-screen">
      <MetaHelmet 
        title="Your PaintSnap Dashboard – See All Your Tracked Spaces at a Glance"
        description="Instantly view your saved Areas, photos, and tags. The PaintSnap dashboard gives you a clear overview of your project—so you know what's been painted and what needs attention."
      />
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}