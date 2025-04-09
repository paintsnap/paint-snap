import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Area, PhotoWithTags } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Card, 
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
import { MoreVertical, Image, Tag } from "lucide-react";

export default function AllPhotosPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithTags | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [targetAreaId, setTargetAreaId] = useState<string>("");
  
  // Query to fetch all photos
  const { 
    data: photos = [], 
    isLoading: isPhotosLoading, 
    error: photosError 
  } = useQuery<PhotoWithTags[]>({ 
    queryKey: ["/api/photos"],
    enabled: !!profile,
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
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
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
  
  const isLoading = isPhotosLoading || isAreasLoading;
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-6 h-6 border-2 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (photosError) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-destructive/20 p-4 rounded-md text-destructive">
          Failed to load photos: {photosError.message}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Photos</h1>
        <p className="text-muted-foreground">View all photos across your areas</p>
      </div>
      
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Image className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No photos yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload photos from the Add page
          </p>
          <Button onClick={() => navigate("/upload")}>
            Upload Photo
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
                    alt={photo.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{photo.name}</CardTitle>
                      <div className="flex flex-col text-xs text-muted-foreground">
                        <span>Area: {photo.areaName}</span>
                        <div className="flex items-center">
                          <Tag className="w-3 h-3 mr-1" />
                          {photo.tagCount} tag{photo.tagCount !== 1 ? "s" : ""}
                        </div>
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
                  .filter(a => selectedPhoto && a.id !== selectedPhoto.areaId)
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