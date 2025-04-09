import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AreaWithPhotos, InsertArea } from "@shared/schema";
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
import { Home, MoreVertical, Plus, Upload, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form schema for creating/updating an area
const areaFormSchema = z.object({
  name: z.string().min(1, "Area name is required").max(50, "Area name is too long"),
});

type AreaFormValues = z.infer<typeof areaFormSchema>;

export default function AreasPage() {
  console.log("AreasPage component rendering");
  
  const { profile } = useAuth();
  console.log("Profile in AreasPage:", profile);
  
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isAddAreaDialogOpen, setIsAddAreaDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaWithPhotos | null>(null);
  
  // Form for creating a new area
  const addAreaForm = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      name: "",
    },
  });
  
  // Form for renaming an area
  const renameAreaForm = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      name: "",
    },
  });
  
  // Query to fetch all areas
  const { 
    data: areas = [], 
    isLoading, 
    error 
  } = useQuery<AreaWithPhotos[]>({ 
    queryKey: ["/api/areas"],
    enabled: !!profile
  });
  
  // Mutation to create a new area
  const createAreaMutation = useMutation({
    mutationFn: async (areaData: InsertArea) => {
      const res = await apiRequest("POST", "/api/areas", areaData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      toast({
        title: "Area created",
        description: "Your new area has been created successfully.",
      });
      setIsAddAreaDialogOpen(false);
      addAreaForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create area",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update an area
  const updateAreaMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/areas/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      toast({
        title: "Area renamed",
        description: "The area has been renamed successfully.",
      });
      setIsRenameDialogOpen(false);
      setSelectedArea(null);
      renameAreaForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rename area",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete an area
  const deleteAreaMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/areas/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      toast({
        title: "Area deleted",
        description: "The area and all its photos have been deleted.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedArea(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete area",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle creating a new area
  const onSubmitNewArea = (values: AreaFormValues) => {
    if (!profile) return;
    
    createAreaMutation.mutate({
      name: values.name,
      userId: profile.id,
    });
  };
  
  // Handle renaming an area
  const onSubmitRenameArea = (values: AreaFormValues) => {
    if (!selectedArea) return;
    
    updateAreaMutation.mutate({
      id: selectedArea.id,
      name: values.name,
    });
  };
  
  // Open rename dialog for an area
  const handleRenameArea = (area: AreaWithPhotos) => {
    setSelectedArea(area);
    renameAreaForm.setValue("name", area.name);
    setIsRenameDialogOpen(true);
  };
  
  // Open delete dialog for an area
  const handleDeleteArea = (area: AreaWithPhotos) => {
    setSelectedArea(area);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle clicking an area card to navigate to area detail
  const handleAreaClick = (areaId: number) => {
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
    return (
      <div className="container mx-auto p-4">
        <div className="bg-destructive/20 p-4 rounded-md text-destructive">
          Failed to load areas: {error.message}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Project</h1>
          <p className="text-muted-foreground">Manage your areas</p>
        </div>
        <Button onClick={() => setIsAddAreaDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Area
        </Button>
      </div>
      
      {areas.length === 0 ? (
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
        
          {areas.map((area) => (
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
                          handleRenameArea(area);
                        }}>
                          Rename Area
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteArea(area);
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
            <form onSubmit={addAreaForm.handleSubmit(onSubmitNewArea)} className="space-y-4">
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
                <Button type="submit" disabled={createAreaMutation.isPending}>
                  {createAreaMutation.isPending ? (
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
            <form onSubmit={renameAreaForm.handleSubmit(onSubmitRenameArea)} className="space-y-4">
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
                <Button type="submit" disabled={updateAreaMutation.isPending}>
                  {updateAreaMutation.isPending ? (
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
              onClick={() => selectedArea && deleteAreaMutation.mutate(selectedArea.id)}
              disabled={deleteAreaMutation.isPending}
            >
              {deleteAreaMutation.isPending ? (
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