import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Area, InsertPhoto } from "@shared/schema";
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
import { Camera, Upload, ImagePlus } from "lucide-react";
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
  const { profile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check URL for areaId parameter
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const preSelectedAreaId = searchParams.get('areaId') || '';
  
  // Form setup
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      areaId: preSelectedAreaId,
    },
  });
  
  // Query to get all areas
  const { 
    data: areas = [], 
    isLoading: isAreasLoading 
  } = useQuery<Area[]>({ 
    queryKey: ["/api/areas"],
    enabled: !!profile,
  });
  
  // Mutation to upload a photo
  const uploadMutation = useMutation({
    mutationFn: async (photoData: FormData) => {
      const res = await fetch('/api/photos', {
        method: 'POST',
        body: photoData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload photo");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/areas/${data.areaId}/photos`] });
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      
      toast({
        title: "Photo uploaded",
        description: "Your photo has been uploaded successfully.",
      });
      
      // Redirect directly to the photo view page instead of area page
      navigate(`/photos/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
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
  
  // Handle form submission
  const onSubmit = async (values: UploadFormValues) => {
    if (!profile) return;
    
    const formData = new FormData();
    formData.append("userId", profile.id.toString());
    formData.append("areaId", values.areaId);
    // Still send a name for the backend, but we won't display it
    formData.append("name", "");
    formData.append("image", values.imageFile);
    
    uploadMutation.mutate(formData);
  };
  
  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Create a new area if none exists
  const handleCreateArea = () => {
    navigate("/");
  };
  
  if (isAreasLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-6 h-6 border-2 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  // If there are no areas, show a message asking the user to create one first
  if (areas.length === 0) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Upload Photo</h1>
        <p className="text-muted-foreground">Add a new photo to your project</p>
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
              
              {/* Area Selection */}
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
                        {areas.map((area) => (
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
              
              {/* No Photo Name field required */}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={uploadMutation.isPending || !imagePreview}
              >
                {uploadMutation.isPending ? (
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
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}