import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Home, MoreVertical, Plus, Upload, Camera, CloudOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Import Firestore hooks and functions
import { useProject } from "@/hooks/use-project";
import { useAreas } from "@/hooks/use-firebase-data";
import { 
  createArea, 
  updateArea, 
  deleteArea,
  AreaWithPhotos 
} from "@/lib/firestore";

// Form schema for creating/updating an area
const areaFormSchema = z.object({
  name: z.string().min(1, "Area name is required").max(50, "Area name is too long"),
});

type AreaFormValues = z.infer<typeof areaFormSchema>;

export default function AreasPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Dialog states
  const [isAddAreaDialogOpen, setIsAddAreaDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaWithPhotos | null>(null);
  
  // Operation states
  const [isCreatingArea, setIsCreatingArea] = useState(false);
  const [isUpdatingArea, setIsUpdatingArea] = useState(false);
  const [isDeletingArea, setIsDeletingArea] = useState(false);
  
  // For refreshing data - use refetch from the hooks directly
  const refreshData = () => refetch();
  
  // Forms
  const addAreaForm = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: { name: "" },
  });
  
  const renameAreaForm = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: { name: "" },
  });
  
  // Get current project
  const { currentProject, isLoading: projectLoading } = useProject();
  
  // Query to fetch all areas for the current project
  const { 
    data: areas = [], 
    isLoading: areasLoading, 
    error,
    refetch
  } = useAreas(currentProject?.id || "");
  
  // Combined loading state
  const isLoading = projectLoading || areasLoading;
  
  // Create new area
  const handleCreateArea = async (data: AreaFormValues) => {
    if (!currentProject || !profile) {
      toast({
        title: "Error",
        description: "Project or user information not available",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingArea(true);
    try {
      await createArea(currentProject.id, profile.id, data.name);
      
      toast({
        title: "Area created",
        description: "Your new area has been created successfully.",
      });
      
      // Refresh data
      refreshData();
      
      // Close dialog and reset form
      setIsAddAreaDialogOpen(false);
      addAreaForm.reset();
    } catch (error) {
      console.error("Error creating area:", error);
      toast({
        title: "Failed to create area",
        description: (error as Error).message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreatingArea(false);
    }
  };
  
  // Handle rename area
  const handleRenameSubmit = async (data: AreaFormValues) => {
    if (!currentProject || !selectedArea) {
      return;
    }
    
    setIsUpdatingArea(true);
    try {
      await updateArea(currentProject.id, selectedArea.id, data.name);
      
      toast({
        title: "Area renamed",
        description: "The area has been renamed successfully.",
      });
      
      // Refresh data
      refreshData();
      
      // Close dialog and reset
      setIsRenameDialogOpen(false);
      setSelectedArea(null);
      renameAreaForm.reset();
    } catch (error) {
      console.error("Error updating area:", error);
      toast({
        title: "Failed to rename area",
        description: (error as Error).message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingArea(false);
    }
  };
  
  // Delete area
  const performDeleteArea = async () => {
    if (!currentProject || !selectedArea) {
      return;
    }
    
    setIsDeletingArea(true);
    try {
      await deleteArea(currentProject.id, selectedArea.id);
      
      toast({
        title: "Area deleted",
        description: "The area and all its photos have been deleted.",
      });
      
      // Refresh data
      refreshData();
      
      // Close dialog
      setIsDeleteDialogOpen(false);
      setSelectedArea(null);
    } catch (error) {
      console.error("Error deleting area:", error);
      toast({
        title: "Failed to delete area",
        description: (error as Error).message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeletingArea(false);
    }
  };
  
  // Open rename dialog for an area
  const openRenameDialog = (area: AreaWithPhotos) => {
    setSelectedArea(area);
    renameAreaForm.setValue("name", area.name);
    setIsRenameDialogOpen(true);
  };
  
  // Open delete dialog for an area
  const openDeleteDialog = (area: AreaWithPhotos) => {
    setSelectedArea(area);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle clicking an area card to navigate to area detail
  const handleAreaClick = (areaId: string) => {
    navigate(`/areas/${areaId}`);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-6 h-6 border-2 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (error) {
    const isConnectionError = 
      error.includes('unavailable') || 
      error.includes('network') || 
      error.includes('connection');
    
    return (
      <div className="container mx-auto p-4">
        <div className="bg-destructive/20 p-4 rounded-md text-destructive">
          <h2 className="text-lg font-semibold mb-2">
            <div className="flex items-center">
              {isConnectionError ? "Connection Issue" : "Error Loading Areas"}
              {isConnectionError && (
                <div className="ml-2 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full flex items-center">
                  <CloudOff className="h-3 w-3 mr-1" />
                  <span>Fallback Mode</span>
                </div>
              )}
            </div>
          </h2>
          <p className="mb-4">
            {isConnectionError 
              ? "We're having trouble connecting to the database. This might be a temporary issue." 
              : `Failed to load areas: ${error}`}
          </p>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="mr-2"
          >
            Retry
          </Button>
          {isConnectionError && (
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </Button>
          )}
        </div>
        
        {/* Fall back to empty state to allow creating new areas even with connection issues */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {currentProject?.name || "Your Project"}
              </h1>
              <p className="text-muted-foreground">Manage your areas</p>
            </div>
            <Button onClick={() => setIsAddAreaDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Area
            </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Home className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No areas available</h3>
            <p className="text-muted-foreground mb-4">
              {isConnectionError 
                ? "Currently unable to load your areas due to connection issues." 
                : "Create your first area to start organizing your photos"}
            </p>
            <Button onClick={() => setIsAddAreaDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Area
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Safe check for areas
  const areasList = areas || [];
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">
              {currentProject?.name || "Your Project"}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage your areas
          </p>
        </div>
        <Button onClick={() => setIsAddAreaDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Area
        </Button>
      </div>
      
      {areasList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Home className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No areas yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first area to start organizing your photos
          </p>
          <Button onClick={() => setIsAddAreaDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Area
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Upload Card */}
          <Card className="overflow-hidden hover:shadow-md transition-shadow border-dashed border-2 border-muted-foreground/30">
            <div 
              className="cursor-pointer h-full flex flex-col items-center justify-center p-6"
              onClick={() => navigate('/upload')}
            >
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-1">Add New Photo</h3>
              <p className="text-muted-foreground text-center">
                Upload photos directly to any area of your project
              </p>
            </div>
          </Card>
        
          {areasList.map((area) => (
            <Card key={area.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div 
                className="cursor-pointer"
                onClick={() => handleAreaClick(area.id)} 
              >
                <div className="h-40 bg-muted flex items-center justify-center">
                  {area.latestPhotoUrl ? (
                    <img 
                      src={area.latestPhotoUrl} 
                      alt={area.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Home className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{area.name}</CardTitle>
                      <CardDescription>
                        {area.photoCount} photo{area.photoCount !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          openRenameDialog(area);
                        }}>
                          Rename Area
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(area);
                          }}
                        >
                          Delete Area
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Dialog for adding a new area */}
      <Dialog open={isAddAreaDialogOpen} onOpenChange={setIsAddAreaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Area</DialogTitle>
            <DialogDescription>
              Create a new area to organize your photos.
            </DialogDescription>
          </DialogHeader>
          <Form {...addAreaForm}>
            <form onSubmit={addAreaForm.handleSubmit(handleCreateArea)} className="space-y-4">
              <FormField
                control={addAreaForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Living Room" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddAreaDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingArea}>
                  {isCreatingArea ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-background rounded-full border-t-transparent"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Area"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for renaming an area */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Area</DialogTitle>
            <DialogDescription>
              Update the name of this area.
            </DialogDescription>
          </DialogHeader>
          <Form {...renameAreaForm}>
            <form onSubmit={renameAreaForm.handleSubmit(handleRenameSubmit)} className="space-y-4">
              <FormField
                control={renameAreaForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingArea}>
                  {isUpdatingArea ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-background rounded-full border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for confirming area deletion */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Area</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this area? This will permanently delete the area
              and all photos within it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={performDeleteArea}
              disabled={isDeletingArea}
            >
              {isDeletingArea ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-background rounded-full border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                "Delete Area"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}