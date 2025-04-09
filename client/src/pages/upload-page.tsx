import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/hooks/use-project";
import { useAreas } from "@/hooks/use-firebase-data";
import { uploadPhoto } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, ImagePlus, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form schema for uploading a photo
const uploadFormSchema = z.object({
  areaId: z.string().min(1, "Please select an area"),
  imageFile: z.any()
    .refine(file => file instanceof File, "Please select an image file")
    .refine(file => file.size <= 10 * 1024 * 1024, "File size should be less than 10MB")
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      "Only JPEG, PNG, and WebP formats are supported"
    ),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export default function UploadPage() {
  const { user, profile } = useAuth();
  const { currentProject } = useProject();
  const projectId = currentProject?.id || '';
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Check URL for areaId parameter
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const preSelectedAreaId = searchParams.get('areaId') || '';
  
  // Get previous page to return to
  const goBack = () => {
    if (preSelectedAreaId) {
      navigate(`/areas/${preSelectedAreaId}`);
    } else {
      navigate("/areas");
    }
  };
  
  // Form setup
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      areaId: preSelectedAreaId,
    },
  });
  
  // Fetch areas using Firebase hook - filtered by current project
  const { 
    data: areas = [], 
    isLoading: isAreasLoading,
    error: areasError 
  } = useAreas(projectId);
  
  // For safe rendering
  const safeAreas = areas || [];
  
  // Area type for type safety
  interface AreaType {
    id: string;
    name: string;
    [key: string]: any; // For other properties
  }
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    form.setValue("imageFile", file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle form submission with Firebase
  const onSubmit = async (values: UploadFormValues) => {
    if (!user || !profile || !projectId) return;
    
    setIsUploading(true);
    try {
      const photoFile = values.imageFile;
      const areaId = values.areaId;
      
      // Upload using Firebase Storage and Firestore
      const photoId = await uploadPhoto(projectId, {
        userId: user.uid,
        areaId: areaId,
        name: "", // Empty name as per requirement
        file: photoFile
      });
      
      toast({
        title: "Photo uploaded",
        description: "Your photo has been uploaded successfully.",
      });
      
      // Navigate to the photo view
      navigate(`/photos/${photoId}`);
    } catch (error: any) {
      toast({
        title: "Failed to upload photo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Create a new area if none exists
  const handleCreateArea = () => {
    navigate("/areas");
  };
  
  if (isAreasLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-6 h-6 border-2 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  // If there are no areas, show a message asking the user to create one first
  if (safeAreas.length === 0) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <Camera className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">No Areas Found</h1>
        <p className="text-muted-foreground text-center mb-6">
          You need to create an area before you can upload photos.
        </p>
        <Button onClick={handleCreateArea}>
          Create Your First Area
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upload Photo</h1>
          <p className="text-muted-foreground">Add a new photo to your project</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={goBack}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </Button>
      </div>
      
      <Card className="mx-auto max-w-lg">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Photo Selection */}
              <div 
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  imagePreview ? 'border-muted-foreground' : 'border-muted hover:border-muted-foreground'
                }`}
                onClick={handleUploadClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                {imagePreview ? (
                  <div className="space-y-4 w-full">
                    <div className="relative rounded-md overflow-hidden w-full h-48">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUploadClick();
                      }}
                    >
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Click to upload</p>
                      <p className="text-xs text-muted-foreground">
                        JPEG, PNG or WebP (max. 10MB)
                      </p>
                    </div>
                  </div>
                )}
                
                {form.formState.errors.imageFile && (
                  <p className="text-destructive text-sm mt-2">
                    {form.formState.errors.imageFile.message as string}
                  </p>
                )}
              </div>
              
              {/* Area Selection - Only show if not pre-selected */}
              {!preSelectedAreaId && (
                <FormField
                  control={form.control}
                  name="areaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {safeAreas.map((area: AreaType) => (
                            <SelectItem key={area.id} value={area.id.toString()}>
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* No Photo Name field required */}
              
              <div className="flex space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={goBack}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isUploading || !imagePreview}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-background rounded-full border-t-transparent"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}