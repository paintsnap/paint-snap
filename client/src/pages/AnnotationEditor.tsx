import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoomImage } from "@/components/ui/zoom-image";
import { Marker } from "@/components/annotation/Marker";
import { AnnotationCard } from "@/components/annotation/AnnotationCard";
import { PhotoWithAnnotationsDetailed, Annotation, insertAnnotationSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Search, Trash2, Plus, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AnnotationEditor() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/edit/:id");
  const photoId = params?.id ? parseInt(params.id, 10) : null;
  
  const [activeAnnotationId, setActiveAnnotationId] = useState<number | null>(null);
  const [showAllMarkers, setShowAllMarkers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newAnnotation, setNewAnnotation] = useState({
    title: "",
    content: "",
    positionX: 0,
    positionY: 0,
    isAdding: false
  });
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  const { toast } = useToast();

  // Fetch photo with annotations
  const { data: photo, isLoading, error } = useQuery<PhotoWithAnnotationsDetailed>({
    queryKey: [`/api/photos/${photoId}`],
    enabled: !!photoId,
  });

  // Add a new annotation
  const createAnnotationMutation = useMutation({
    mutationFn: async (annotation: Omit<Annotation, "id" | "createdAt">) => {
      const response = await apiRequest(
        "POST", 
        `/api/photos/${photoId}/annotations`, 
        annotation
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Annotation added",
        description: "Your annotation has been added successfully.",
      });
      
      // Reset new annotation form
      setNewAnnotation({
        title: "",
        content: "",
        positionX: 0,
        positionY: 0,
        isAdding: false
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to add annotation",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Update an annotation
  const updateAnnotationMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: number; title: string; content: string }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/annotations/${id}`, 
        { title, content }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Annotation updated",
        description: "Your changes have been saved.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update annotation",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete an annotation
  const deleteAnnotationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/annotations/${id}`);
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: "Annotation deleted",
        description: "The annotation has been removed.",
      });
      
      // If the deleted annotation was active, reset active
      if (activeAnnotationId === id) {
        setActiveAnnotationId(null);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete annotation",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Clear all annotations
  const clearAllAnnotationsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/photos/${photoId}/annotations`);
    },
    onSuccess: () => {
      toast({
        title: "All annotations cleared",
        description: "All annotations have been removed from this photo.",
      });
      
      // Reset active annotation
      setActiveAnnotationId(null);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
      
      // Close dialog
      setShowClearDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to clear annotations",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      setShowClearDialog(false);
    }
  });

  // Handle image click to add a new marker
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (newAnnotation.isAdding) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setNewAnnotation({
      title: "",
      content: "",
      positionX: Math.round(x),
      positionY: Math.round(y),
      isAdding: true
    });
    
    // Clear active annotation when adding new one
    setActiveAnnotationId(null);
  };

  // Handle marker click to show the associated annotation
  const handleMarkerClick = (annotationId: number) => {
    setActiveAnnotationId(activeAnnotationId === annotationId ? null : annotationId);
    
    // Cancel adding new annotation if a marker is clicked
    if (newAnnotation.isAdding) {
      setNewAnnotation({
        title: "",
        content: "",
        positionX: 0,
        positionY: 0,
        isAdding: false
      });
    }
  };

  // Handle saving a new annotation
  const handleSaveNewAnnotation = () => {
    try {
      const validatedData = insertAnnotationSchema.parse({
        photoId: photoId as number,
        title: newAnnotation.title,
        content: newAnnotation.content,
        positionX: newAnnotation.positionX,
        positionY: newAnnotation.positionY
      });
      
      createAnnotationMutation.mutate(validatedData);
    } catch (error) {
      toast({
        title: "Validation error",
        description: "Please fill out all required fields.",
        variant: "destructive"
      });
    }
  };

  // Handle canceling a new annotation
  const handleCancelNewAnnotation = () => {
    setNewAnnotation({
      title: "",
      content: "",
      positionX: 0,
      positionY: 0,
      isAdding: false
    });
  };

  // Filter annotations based on search term
  const filteredAnnotations = photo?.annotations.filter(annotation => 
    annotation.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    annotation.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Return to gallery
  const handleBackToGallery = () => {
    navigate("/");
  };

  // If photo ID is invalid, redirect to gallery
  useEffect(() => {
    if (photoId === null || isNaN(photoId)) {
      navigate("/");
    }
  }, [photoId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-[400px] w-full" />
            <div className="w-full md:w-80">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-6 w-32 mb-2" />
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 text-red-500 flex items-center justify-center bg-red-100 rounded-full mb-4">
            <X className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Error Loading Photo</h2>
          <p className="text-gray-600 mb-4">
            We couldn't load the photo you're looking for. It may have been deleted or there might be a temporary issue.
          </p>
          <Button onClick={handleBackToGallery}>Back to Gallery</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-4 flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToGallery} 
            className="mr-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-xl font-semibold font-sans">{photo.name}</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Image annotation area */}
            <div className="flex-1 relative image-container overflow-hidden cursor-crosshair border border-gray-200 rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
              <ZoomImage
                src={photo.imageUrl}
                alt={photo.name}
                containerClassName="w-full h-auto"
              >
                <AnimatePresence>
                  {/* Show existing markers */}
                  {showAllMarkers && photo.annotations.map((annotation) => (
                    <Marker
                      key={annotation.id}
                      id={annotation.id}
                      x={annotation.positionX}
                      y={annotation.positionY}
                      isActive={annotation.id === activeAnnotationId}
                      onClick={() => handleMarkerClick(annotation.id)}
                    />
                  ))}
                  
                  {/* Show new marker when adding */}
                  {newAnnotation.isAdding && (
                    <Marker
                      key="new-marker"
                      id={0}
                      x={newAnnotation.positionX}
                      y={newAnnotation.positionY}
                      isActive={true}
                      onClick={() => {}}
                    />
                  )}
                </AnimatePresence>
                
                {/* Invisible overlay to capture clicks */}
                <div 
                  className="absolute inset-0 z-10" 
                  onClick={(e) => handleImageClick(e as React.MouseEvent<HTMLImageElement>)}
                ></div>
              </ZoomImage>
            </div>
            
            {/* Annotation panel */}
            <div className="w-full md:w-80 flex-shrink-0 bg-gray-50 p-4 md:border-l border-gray-200">
              <div className="mb-4">
                <h3 className="font-sans font-medium text-gray-900 mb-2">Annotations</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Click on the image to add annotation points, then add your notes.
                </p>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="show-markers" 
                      checked={showAllMarkers} 
                      onCheckedChange={setShowAllMarkers}
                    />
                    <Label htmlFor="show-markers" className="text-sm font-medium text-gray-700">
                      Show all markers
                    </Label>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    onClick={() => setShowClearDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                </div>

                <div className="relative mb-4">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Search annotations..."
                    className="pl-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* New annotation form */}
              {newAnnotation.isAdding && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mb-4 p-3 bg-white border border-[#FF4081] rounded-md shadow-sm"
                >
                  <h4 className="text-sm font-medium mb-2 font-sans">New Annotation</h4>
                  <Input
                    className="mb-2 text-sm"
                    placeholder="Title (e.g., Wall Color)"
                    value={newAnnotation.title}
                    onChange={(e) => setNewAnnotation({...newAnnotation, title: e.target.value})}
                  />
                  <Textarea
                    className="mb-3 text-sm resize-none"
                    placeholder="Description (e.g., Benjamin Moore Pale Oak)"
                    rows={3}
                    value={newAnnotation.content}
                    onChange={(e) => setNewAnnotation({...newAnnotation, content: e.target.value})}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelNewAnnotation}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveNewAnnotation}
                      disabled={!newAnnotation.title.trim() || !newAnnotation.content.trim() || createAnnotationMutation.isPending}
                    >
                      {createAnnotationMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </motion.div>
              )}
              
              {/* Annotation list */}
              <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto">
                {filteredAnnotations.length === 0 && !newAnnotation.isAdding && (
                  <div className="text-center py-6 text-gray-500 text-sm bg-white rounded-md border border-gray-200">
                    {searchTerm ? (
                      <>No annotations match your search.</>
                    ) : (
                      <>No annotations yet. Click on the image to add a point.</>
                    )}
                  </div>
                )}
                
                {filteredAnnotations.map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    annotation={annotation}
                    isActive={annotation.id === activeAnnotationId}
                    onEdit={(id, title, content) => updateAnnotationMutation.mutate({ id, title, content })}
                    onDelete={(id) => deleteAnnotationMutation.mutate(id)}
                  />
                ))}
              </div>

              {/* Add annotation instruction/button */}
              {!newAnnotation.isAdding && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">
                    Click on the image to add a new marker, or:
                  </p>
                  <Button 
                    className="w-full bg-[#2196F3] hover:bg-blue-600"
                    onClick={() => {
                      toast({
                        description: "Click on the image to place your annotation marker."
                      });
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Annotation
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Clear all annotations confirmation dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Annotations</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to remove all annotations from this photo? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              disabled={clearAllAnnotationsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearAllAnnotationsMutation.mutate()}
              disabled={clearAllAnnotationsMutation.isPending}
            >
              {clearAllAnnotationsMutation.isPending ? "Clearing..." : "Clear All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
