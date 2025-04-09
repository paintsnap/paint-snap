import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Camera, FolderOpenDot, Grid2X2, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/hooks/use-project";
import { useAreas } from "@/hooks/use-firebase-data";

export default function DashboardPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [, setLocation] = useLocation();

  // Fetch areas if we have a current project
  const { 
    data: areas, 
    isLoading: areasLoading 
  } = useAreas(currentProject?.id || "");

  // Redirect to areas page if user has areas
  useEffect(() => {
    if (!authLoading && !projectLoading && !areasLoading && areas && areas.length > 0) {
      setLocation("/areas");
    }
  }, [authLoading, projectLoading, areasLoading, areas, setLocation]);

  // Handle navigation
  const navigateToAreas = () => setLocation("/areas");
  const navigateToUpload = () => setLocation("/upload");
  const navigateToAllPhotos = () => setLocation("/photos");

  const isLoading = authLoading || projectLoading || areasLoading;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <Camera className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-3xl font-bold">Welcome to PaintSnap</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Organize and annotate your interior design photos with precision
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FolderOpenDot className="mr-2 h-5 w-5 text-primary" />
              Your Areas
            </CardTitle>
            <CardDescription>
              Organize photos by room or location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create separate areas for different rooms, properties, or projects to keep your photos organized.
            </p>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={navigateToAreas} className="flex items-center">
              View Areas <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PlusSquare className="mr-2 h-5 w-5 text-primary" />
              Upload Photos
            </CardTitle>
            <CardDescription>
              Add new photos to your collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Upload photos directly from your device. You can add annotations after uploading.
            </p>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={navigateToUpload} className="flex items-center">
              Upload Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Grid2X2 className="mr-2 h-5 w-5 text-primary" />
              All Photos
            </CardTitle>
            <CardDescription>
              View your entire photo collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Browse all your uploaded photos in one place, regardless of which area they belong to.
            </p>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={navigateToAllPhotos} className="flex items-center">
              View Gallery <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="bg-muted rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
          <li><span className="font-medium text-foreground">Create Areas</span> - Start by creating different areas to organize your photos</li>
          <li><span className="font-medium text-foreground">Upload Photos</span> - Add photos to your areas</li>
          <li><span className="font-medium text-foreground">Add Tags</span> - Place precise markers on your photos with detailed information</li>
          <li><span className="font-medium text-foreground">Browse and Organize</span> - Easily navigate between areas and photos</li>
        </ol>
      </div>
    </div>
  );
}