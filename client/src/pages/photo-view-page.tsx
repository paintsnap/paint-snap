import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PhotoWithTagsDetailed, Tag, InsertTag } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Tag as TagIcon, X, Edit, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form schema for adding/editing a tag
const tagFormSchema = z.object({
  description: z.string().min(1, "Description is required").max(50, "Description is too long"),
  details: z.string().max(200, "Details are too long").optional(),
  notes: z.string().max(500, "Notes are too long").optional(),
  tagImage: z.any().optional(),
});

type TagFormValues = z.infer<typeof tagFormSchema>;

// Tag marker component
function TagMarker({ 
  tag, 
  isActive = false, 
  isNumbered = false,
  markerNumber,
  onClick,
  onEdit,
  onDelete
}: { 
  tag: Tag;
  isActive?: boolean;
  isNumbered?: boolean;
  markerNumber?: number;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div 
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 group`}
      style={{ 
        left: `${tag.positionX}%`, 
        top: `${tag.positionY}%` 
      }}
    >
      <div
        className={`flex items-center justify-center w-6 h-6 rounded-full border-2 cursor-pointer transition-colors ${
          isActive 
            ? 'bg-primary text-primary-foreground border-primary-foreground' 
            : 'bg-primary/80 hover:bg-primary text-primary-foreground border-primary-foreground/50'
        }`}
        onClick={onClick}
      >
        {isNumbered ? (
          <span className="text-xs font-bold">
            {markerNumber || tag.id}
          </span>
        ) : (
          <TagIcon className="w-3 h-3" />
        )}
      </div>
      
      {/* Edit and delete buttons that appear on hover */}
      <div className="absolute top-0 right-0 -mr-6 hidden group-hover:flex space-x-1">
        <button 
          className="bg-background text-foreground p-1 rounded-full shadow hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit className="w-3 h-3" />
        </button>
        <button 
          className="bg-background text-destructive p-1 rounded-full shadow hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Tag details sidebar component
function TagDetailsSidebar({ 
  tag, 
  onClose 
}: { 
  tag: Tag;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-0 h-full bg-background border-l border-border w-full max-w-md shadow-lg overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{tag.description}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {tag.details && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Details</h4>
            <p className="text-sm">{tag.details}</p>
          </div>
        )}
        
        {tag.notes && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Notes</h4>
            <p className="text-sm">{tag.notes}</p>
          </div>
        )}
        
        {tag.tagImage && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Image</h4>
            <img 
              src={`data:image/jpeg;base64,${tag.tagImage}`}
              alt="Tag attachment"
              className="w-full max-h-48 object-contain border rounded-md"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PhotoViewPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/photos/:id");
  const photoId = params?.id ? parseInt(params.id) : null;
  
  const [activeTagId, setActiveTagId] = useState<number | null>(null);
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [tagPosition, setTagPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTagFormOpen, setIsTagFormOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  const imageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form setup
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      description: "",
      details: "",
      notes: "",
    },
  });
  
  // Query to fetch the photo with its tags
  const { 
    data: photo,
    isLoading, 
    error 
  } = useQuery<PhotoWithTagsDetailed>({ 
    queryKey: [`/api/photos/${photoId}`],
    enabled: !!photoId && !!profile,
  });
  
  // Mutation to create a new tag
  const createTagMutation = useMutation({
    mutationFn: async (tagData: FormData) => {
      const res = await fetch(`/api/photos/${photoId}/tags`, {
        method: 'POST',
        body: tagData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create tag");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
      toast({
        title: "Tag added",
        description: "Your tag has been added successfully.",
      });
      setIsTagFormOpen(false);
      form.reset();
      setTagPosition(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update a tag
  const updateTagMutation = useMutation({
    mutationFn: async ({ tagId, data }: { tagId: number; data: FormData }) => {
      const res = await fetch(`/api/photos/${photoId}/tags/${tagId}`, {
        method: 'PATCH',
        body: data,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update tag");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
      toast({
        title: "Tag updated",
        description: "Your tag has been updated successfully.",
      });
      setIsTagFormOpen(false);
      setIsEditing(false);
      setSelectedTag(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete a tag
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const res = await apiRequest("DELETE", `/api/photos/${photoId}/tags/${tagId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
      toast({
        title: "Tag deleted",
        description: "The tag has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedTag(null);
      setActiveTagId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle clicking on the image to add a tag
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingTag || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTagPosition({ x, y });
    setIsTagFormOpen(true);
    setIsAddingTag(false);
  };
  
  // Handle submission of the tag form
  const onSubmitTag = (values: TagFormValues) => {
    if (!profile || !photoId) return;
    
    const formData = new FormData();
    
    if (isEditing && selectedTag) {
      // Update existing tag
      formData.append("description", values.description);
      formData.append("details", values.details || "");
      formData.append("notes", values.notes || "");
      
      if (values.tagImage instanceof File) {
        formData.append("tagImage", values.tagImage);
      }
      
      updateTagMutation.mutate({ 
        tagId: selectedTag.id, 
        data: formData 
      });
    } else if (tagPosition) {
      // Create new tag
      formData.append("userId", profile.id.toString());
      formData.append("photoId", photoId.toString());
      formData.append("description", values.description);
      formData.append("details", values.details || "");
      formData.append("notes", values.notes || "");
      formData.append("positionX", tagPosition.x.toString());
      formData.append("positionY", tagPosition.y.toString());
      
      if (values.tagImage instanceof File) {
        formData.append("tagImage", values.tagImage);
      }
      
      createTagMutation.mutate(formData);
    }
  };
  
  // Handle tag click
  const handleTagClick = (tagId: number) => {
    setActiveTagId(activeTagId === tagId ? null : tagId);
  };
  
  // Handle edit tag button click
  const handleEditTag = (tag: Tag) => {
    setSelectedTag(tag);
    setIsEditing(true);
    
    // Set form values
    form.setValue("description", tag.description);
    form.setValue("details", tag.details || "");
    form.setValue("notes", tag.notes || "");
    
    setIsTagFormOpen(true);
    setActiveTagId(null);
  };
  
  // Handle delete tag button click
  const handleDeleteTag = (tag: Tag) => {
    setSelectedTag(tag);
    setIsDeleteDialogOpen(true);
    setActiveTagId(null);
  };
  
  // Handle file selection for tag image
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    form.setValue("tagImage", file);
  };
  
  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Go back to the area or all photos
  const handleBackClick = () => {
    if (photo?.areaId) {
      navigate(`/areas/${photo.areaId}`);
    } else {
      navigate("/photos");
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-6 h-6 border-2 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (error || !photo) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-destructive/20 p-4 rounded-md text-destructive">
          Failed to load photo: {error?.message || "Photo not found"}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-2" onClick={handleBackClick}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{photo.areaName}</h1>
          <p className="text-muted-foreground">
            {photo.tagCount} tag{photo.tagCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      
      <div className="relative max-w-4xl mx-auto">
        {/* Tag Add Button */}
        <div className="absolute top-4 right-4 z-10">
          <Button 
            variant={isAddingTag ? "secondary" : "secondary"} 
            size="sm"
            onClick={() => setIsAddingTag(!isAddingTag)}
          >
            {isAddingTag ? (
              <>Cancel</>
            ) : (
              <>
                <TagIcon className="w-4 h-4 mr-2" />
                Add Tag
              </>
            )}
          </Button>
        </div>
        
        {/* Image Container with Tags */}
        <div 
          ref={imageRef}
          className="relative border rounded-lg overflow-hidden cursor-pointer"
          onClick={handleImageClick}
        >
          <img 
            src={photo.imageUrl} 
            alt="Photo" 
            className="w-full h-auto"
          />
          
          {/* Tag Markers */}
          {photo.tags.map((tag, index) => (
            <TagMarker 
              key={tag.id}
              tag={tag}
              isActive={activeTagId === tag.id}
              isNumbered={true}
              markerNumber={index + 1}
              onClick={() => handleTagClick(tag.id)}
              onEdit={() => handleEditTag(tag)}
              onDelete={() => handleDeleteTag(tag)}
            />
          ))}
          
          {/* Active Tag Details Sidebar */}
          {activeTagId && (
            <TagDetailsSidebar 
              tag={photo.tags.find(t => t.id === activeTagId)!}
              onClose={() => setActiveTagId(null)}
            />
          )}
        </div>
        
        {/* Tag List Below */}
        <div className="mt-6 space-y-2">
          <h2 className="text-lg font-semibold">Tags</h2>
          {photo.tags.length === 0 ? (
            <p className="text-muted-foreground">
              No tags added yet. Click on the image to add a tag.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {photo.tags.map((tag, index) => (
                <div 
                  key={tag.id}
                  className={`p-3 border rounded-md cursor-pointer hover:bg-muted transition-colors ${
                    activeTagId === tag.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleTagClick(tag.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground mr-2 text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{tag.description}</h3>
                        {tag.details && <p className="text-sm text-muted-foreground mt-1">{tag.details}</p>}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTag(tag);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTag(tag);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Tag Form Dialog */}
      <Dialog open={isTagFormOpen} onOpenChange={(open) => {
        setIsTagFormOpen(open);
        if (!open) {
          setIsEditing(false);
          setSelectedTag(null);
          setTagPosition(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Tag" : "Add New Tag"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the details of this tag" : "Add details for this tag"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmitTag)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </label>
              <Input 
                id="description"
                placeholder="e.g. Kitchen Wall Paint"
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="details" className="text-sm font-medium">
                Details
              </label>
              <Input 
                id="details"
                placeholder="e.g. Benjamin Moore Revere Pewter HC-172"
                {...form.register("details")}
              />
              {form.formState.errors.details && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.details.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea 
                id="notes"
                placeholder="e.g. Last painted in January 2023, used eggshell finish"
                rows={3}
                {...form.register("notes")}
              />
              {form.formState.errors.notes && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.notes.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tag Image (Optional)
              </label>
              
              <div 
                className="border border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleUploadClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                <p className="text-sm text-muted-foreground">
                  Click to upload an image (e.g., paint swatch or product label)
                </p>
                
                {form.watch("tagImage") instanceof File && (
                  <p className="text-xs text-primary mt-2">
                    {(form.watch("tagImage") as File).name}
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTagFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createTagMutation.isPending || updateTagMutation.isPending}
              >
                {(createTagMutation.isPending || updateTagMutation.isPending) ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-background rounded-full border-t-transparent"></div>
                    {isEditing ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  isEditing ? "Update Tag" : "Add Tag"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Tag Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tag? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedTag && deleteTagMutation.mutate(selectedTag.id)}
              disabled={deleteTagMutation.isPending}
            >
              {deleteTagMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-background rounded-full border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                "Delete Tag"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}