import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoomImage } from "@/components/ui/zoom-image";
import { Marker } from "@/components/annotation/Marker";
import { PhotoWithAnnotationsDetailed } from "@shared/schema";
import { formatDate } from "@/lib/utils/image-utils";
import { ArrowLeft, Edit, Download, X } from "lucide-react";

export default function AnnotationView() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/view/:id");
  const photoId = params?.id ? parseInt(params.id, 10) : null;

  // Fetch photo with annotations
  const { data: photo, isLoading, error } = useQuery<PhotoWithAnnotationsDetailed>({
    queryKey: [`/api/photos/${photoId}`],
    enabled: !!photoId,
  });

  // Return to gallery
  const handleBackToGallery = () => {
    navigate("/");
  };

  // Go to edit mode
  const handleEdit = () => {
    if (photoId) {
      navigate(`/edit/${photoId}`);
    }
  };

  // Mock download function
  const handleDownload = () => {
    if (photo) {
      const element = document.createElement("a");
      element.href = photo.imageUrl;
      element.download = photo.name + ".jpg";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
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
            <div className="w-full md:w-96">
              <Skeleton className="h-6 w-40 mb-2" />
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
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
          <h1 className="text-xl font-semibold font-sans">{photo.name} Details</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Image with markers */}
            <div className="flex-1 relative overflow-hidden border border-gray-200 rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
              <ZoomImage
                src={photo.imageUrl}
                alt={photo.name}
                containerClassName="w-full h-auto"
              >
                {/* Show numbered markers */}
                {photo.annotations.map((annotation, index) => (
                  <Marker
                    key={annotation.id}
                    id={index + 1}
                    x={annotation.positionX}
                    y={annotation.positionY}
                    isNumbered={true}
                  />
                ))}
              </ZoomImage>
            </div>
            
            {/* Annotations list */}
            <div className="w-full md:w-96 flex-shrink-0 bg-gray-50 p-4 md:border-l border-gray-200">
              <h3 className="font-sans font-medium text-gray-900 mb-4">All Annotations</h3>
              
              {photo.annotations.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm bg-white rounded-md border border-gray-200">
                  No annotations have been added to this photo yet.
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {photo.annotations.map((annotation, index) => (
                    <div key={annotation.id} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 rounded-full bg-[#FFA000] flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <h4 className="ml-2 font-medium font-sans">{annotation.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{annotation.content}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={handleDownload}
                  disabled={photo.annotations.length === 0}
                >
                  <Download className="h-5 w-5 mr-1" />
                  Download
                </Button>
                <Button onClick={handleEdit} className="bg-[#2196F3] hover:bg-blue-600">
                  <Edit className="h-5 w-5 mr-1" />
                  Edit
                </Button>
              </div>

              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>Last updated: {formatDate(new Date(photo.lastModified))}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
