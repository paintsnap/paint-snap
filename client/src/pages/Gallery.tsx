import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadModal } from "@/components/modals/UploadModal";
import { AuthModal } from "@/components/modals/AuthModal";
import { PhotoWithAnnotations } from "@shared/schema";
import { UploadCloud, Edit, ChevronRight, Camera, LogOut, LogIn, User } from "lucide-react";
import { formatDate } from "@/lib/utils/image-utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../hooks/use-auth";

export default function Gallery() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("gallery");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, profile, loading, signOut, error: authError } = useAuth();

  const { data: photos, isLoading, error: fetchError } = useQuery<PhotoWithAnnotations[]>({
    queryKey: ["/api/photos"],
  });

  // Function to open the upload modal
  const openUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  // Get current date for sorting recent items
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Recent photos (last 7 days with annotations)
  const recentPhotos = photos?.filter(photo => 
    new Date(photo.lastModified) > oneWeekAgo && photo.annotationCount > 0
  ).sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  ) || [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <Camera className="h-8 w-8 text-[#2196F3]" />
          <h1 className="ml-3 text-xl font-semibold font-sans">Photo Annotator</h1>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center mr-2">
                {profile?.photoUrl && (
                  <img 
                    src={profile.photoUrl} 
                    alt={profile.displayName || "User"} 
                    className="w-8 h-8 rounded-full mr-2"
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {profile?.displayName || "User"}
                </span>
              </div>
              <Button onClick={openUploadModal} className="bg-[#2196F3] hover:bg-blue-600">
                <UploadCloud className="h-5 w-5 mr-2" />
                Upload Photo
              </Button>
              <Button onClick={signOut} variant="outline" className="border-gray-300">
                <LogOut className="h-5 w-5 mr-2" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <Button onClick={() => setLocation("/auth")} className="bg-[#2196F3] hover:bg-blue-600">
              <LogIn className="h-5 w-5 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 bg-gray-50">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-transparent">
              <TabsTrigger 
                value="gallery" 
                className="data-[state=active]:border-[#2196F3] data-[state=active]:text-[#2196F3] data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-4"
              >
                Gallery
              </TabsTrigger>
              <TabsTrigger 
                value="recent" 
                className="data-[state=active]:border-[#2196F3] data-[state=active]:text-[#2196F3] data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-4"
              >
                Recent Annotations
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Empty State */}
        {!isLoading && photos?.length === 0 && (
          <div className="text-center py-12 px-4 mt-4">
            <Camera className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 font-sans">No photos yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              {user ? 
                "Get started by uploading your first photo. You can add annotations by clicking on specific areas of the image." :
                "Sign in to upload and annotate your photos. The app allows you to create detailed notes on specific areas of your images."
              }
            </p>
            {user ? (
              <Button onClick={openUploadModal} className="mt-5 bg-[#2196F3] hover:bg-blue-600">
                <UploadCloud className="h-5 w-5 mr-2" />
                Upload a photo
              </Button>
            ) : (
              <Button onClick={() => setLocation("/auth")} className="mt-5 bg-[#2196F3] hover:bg-blue-600">
                <LogIn className="h-5 w-5 mr-2" />
                Sign in
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24 mb-3" />
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {fetchError && (
          <div className="text-center py-12 px-4 mt-4">
            <div className="mx-auto h-16 w-16 text-red-500 flex items-center justify-center rounded-full bg-red-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 font-sans">Failed to load photos</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              There was a problem loading your photos. Please try again later.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-5"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Photo Gallery */}
        {!isLoading && photos && photos.length > 0 && activeTab === "gallery" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  <img 
                    src={photo.imageUrl} 
                    alt={photo.name} 
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-0 right-0 p-2">
                    <span className="bg-white text-xs font-medium px-2 py-1 rounded-full shadow-sm text-gray-700">
                      {photo.annotationCount} {photo.annotationCount === 1 ? 'note' : 'notes'}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-sans font-medium text-gray-900 mb-1">{photo.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Updated {formatDate(new Date(photo.lastModified))}
                  </p>
                  <div className="flex justify-between items-center">
                    <Link href={`/edit/${photo.id}`}>
                      <Button variant="ghost" size="sm" className="text-[#2196F3] hover:text-blue-700 hover:bg-blue-50 p-0 h-auto font-sans">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/view/${photo.id}`}>
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 p-0 h-auto font-sans">
                        Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent Annotations */}
        {!isLoading && photos && activeTab === "recent" && (
          <div className="grid grid-cols-1 gap-4">
            {recentPhotos.length > 0 ? (
              recentPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-48 h-48">
                      <img 
                        src={photo.imageUrl} 
                        alt={photo.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4 flex-1">
                      <h3 className="font-sans font-medium text-gray-900 mb-1">{photo.name}</h3>
                      <div className="flex items-center mb-3">
                        <span className="bg-[#FFA000] text-white text-xs font-medium px-2 py-1 rounded-full mr-2">
                          {photo.annotationCount} {photo.annotationCount === 1 ? 'note' : 'notes'}
                        </span>
                        <p className="text-sm text-gray-500">
                          Updated {formatDate(new Date(photo.lastModified))}
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <Link href={`/edit/${photo.id}`}>
                          <Button variant="outline" size="sm" className="border-[#2196F3] text-[#2196F3]">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/view/${photo.id}`}>
                          <Button size="sm" className="bg-[#2196F3] hover:bg-blue-600">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-gray-500">No recently annotated photos.</p>
              </div>
            )}
          </div>
        )}

        {/* Floating action button for mobile */}
        {user && (
          <div className="fixed bottom-6 right-6 md:hidden">
            <Button 
              onClick={openUploadModal} 
              size="icon" 
              className="w-14 h-14 rounded-full bg-[#2196F3] hover:bg-blue-600 shadow-lg"
            >
              <UploadCloud className="h-6 w-6" />
            </Button>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
