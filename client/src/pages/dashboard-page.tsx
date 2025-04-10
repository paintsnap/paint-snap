import { useEffect } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/hooks/use-project";
import { useAreas } from "@/hooks/use-firebase-data";

export default function DashboardPage() {
  const { isLoading: authLoading } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();

  // Fetch areas if we have a current project
  const { isLoading: areasLoading } = useAreas(currentProject?.id || "");

  // Just show a blank page during redirect to minimize flickering
  if (!authLoading && !projectLoading && !areasLoading) {
    return <Redirect to="/areas" />;
  }

  // Completely blank loading state - won't be visible due to immediate redirect
  return null;
}