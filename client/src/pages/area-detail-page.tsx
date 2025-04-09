import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Area, PhotoWithTags } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ChevronLeft, MoreVertical, Image, Tag } from "lucide-react";

export default function AreaDetailPage() {
  console.log("AreaDetailPage component rendering");
  
  const { profile } = useAuth();
  console.log("Profile in AreaDetailPage:", profile);
  
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/areas/:id");
  console.log("Route match:", match, "params:", params);
  
  const areaId = params?.id ? parseInt(params.id) : null;
  console.log("Parsed areaId:", areaId);
  
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithTags | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [targetAreaId, setTargetAreaId] = useState<string>("");
  
  // Query to fetch the current area
  const { 
    data: area,
    isLoading: isAreaLoading, 
    error: areaError 
  } = useQuery<Area>({ 
    queryKey: [`/api/areas/${areaId}`],
    enabled: !!areaId && !!profile,
  });
  
  // Query to fetch photos for the current area
  const { 
    data: photos = [], 
    isLoading: isPhotosLoading, 
    error: photosError 
  } = useQuery<PhotoWithTags[]>({ 
    queryKey: [`/api/areas/${areaId}/photos`],
    enabled: !!areaId && !!profile
  });
  
  // Query to get all areas for moving photos
  const { 
    data: areas = [], 
    isLoading: isAreasLoading 
  } = useQuery<Area[]>({ 
    queryKey: ["/api/areas"],
    enabled: !!profile,
  });
  
  // Mutation to move a photo to a different area
  const movePhotoMutation = useMutation({
    mutationFn: async ({ photoId, areaId }: { photoId: number; areaId: number }) => {
      const res = await apiRequest("PATCH", `/api/photos/${photoId}/move`, { areaId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/areas/${areaId}/photos`] });
      toast({
        title: "Photo moved",
        description: "The photo has been moved to another area.",
      });
      setIsMoveDialogOpen(false);
      setSelectedPhoto(null);
      setTargetAreaId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to move photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete a photo
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await apiRequest("DELETE", `/api/photos/${photoId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/areas/${areaId}/photos`] });
      toast({
        title: "Photo deleted",
        description: "The photo has been permanently deleted.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedPhoto(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle moving a photo
  const handleMoveConfirm = () => {
    if (!selectedPhoto || !targetAreaId) return;
    
    movePhotoMutation.mutate({
      photoId: selectedPhoto.id,
      areaId: parseInt(targetAreaId),
    });
  };
  
  // Handle deleting a photo
  const handleDeleteConfirm = () => {
    if (!selectedPhoto) return;
    
    deletePhotoMutation.mutate(selectedPhoto.id);
  };
  
  // Open move dialog for a photo
  const handleMovePhoto = (photo: PhotoWithTags) => {
    setSelectedPhoto(photo);
    setIsMoveDialogOpen(true);
  };
  
  // Open delete dialog for a photo
  const handleDeletePhoto = (photo: PhotoWithTags) => {
    setSelectedPhoto(photo);
    setIsDeleteDialogOpen(true);
  };
  
  // Navigate to photo detail view
  const handlePhotoClick = (photoId: number) => {
    navigate(`/photos/${photoId}`);
  };
  
  // Go back to areas list
  const handleBackClick = () => {
    navigate("/");
  };
  
  const isLoading = isAreaLoading || isPhotosLoading;
  const error = areaError || photosError;
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-6 h-6 border-2 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (error || !area) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-destructive/20 p-4 rounded-md text-destructive">
          Failed to load area: {error?.message || "Area not found"}
        </div>
        <Button variant="outline" className="mt-4" onClick={handleBackClick}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Areas
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-2" onClick={handleBackClick}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{area.name}</h1>
            <p className="text-muted-foreground">
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => {
            // Navigate to upload page with pre-selected area
            navigate(`/upload?areaId=${areaId}`);
          }}
        >
          Add Photo
        </Button>
      </div>
      
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Image className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No photos yet</h3>
          <p className="text-muted-foreground mb-4">
            Add photos to get started with this area
          </p>
          <Button 
            onClick={() => navigate(`/upload?areaId=${areaId}`)}
            variant="outline"
            size="lg"
            className="flex items-center gap-2"
          >
            <Image className="w-4 h-4" />
            Add Your First Photo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div 
                className="cursor-pointer"
                onClick={() => handlePhotoClick(photo.id)} 
              >
                <div className="h-48 bg-muted">
                  <img 
                    src={photo.imageUrl} 
                    alt="Photo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Tag className="w-4 h-4 mr-1 text-primary" />
                        {photo.tagCount} tag{photo.tagCount !== 1 ? "s" : ""}
                      </div>
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
                          handleMovePhoto(photo);
                        }}>
                          Move Photo
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo);
                          }}
                        >
                          Delete Photo
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
      
      {/* Dialog for moving a photo */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Photo to Another Area</DialogTitle>
            <DialogDescription>
              Select the destination area for this photo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select 
              value={targetAreaId} 
              onValueChange={setTargetAreaId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an area" />
              </SelectTrigger>
              <SelectContent>
                {areas
                  .filter(a => a.id !== areaId)
                  .map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMoveConfirm}
              disabled={!targetAreaId || movePhotoMutation.isPending}
            >
              {movePhotoMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-background rounded-full border-t-transparent"></div>
                  Moving...
                </>
              ) : (
                "Move Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for confirming photo deletion */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this photo? This will permanently delete the photo
              and all its tags. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deletePhotoMutation.isPending}
            >
              {deletePhotoMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-background rounded-full border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                "Delete Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}