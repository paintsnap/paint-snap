import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { Home, Plus, Grid, LogOut, Camera, Mail, AlertTriangle, X, User, Settings, HelpCircle } from "lucide-react";
import logoImage from "@assets/PaintSnap-Full-Logo-sm.png";
import logoImageLight from "@assets/PaintSnap-Full-Logo-light-sm.png";
import logoIcon from "@assets/PaintSnap-Icon.png";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import our pages
import LandingPage from "@/pages/landing-page";
import DashboardPage from "@/pages/dashboard-page";
import AreasPage from "@/pages/areas-page";
import UploadPage from "@/pages/upload-page";
import AllPhotosPage from "@/pages/all-photos-page";
import AreaDetailPage from "@/pages/area-detail-page";
import PhotoViewPage from "@/pages/photo-view-page";
import SettingsPage from "@/pages/settings-page";
import SupportPage from "@/pages/support-page";

// Navigation component for mobile/desktop
function BottomNavigation() {
  const [, setLocation] = useLocation();
  
  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setLocation(path);
  };
  
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
      <div className="grid h-full grid-cols-3 mx-auto">
        <a
          href="/dashboard"
          onClick={handleNavigation('/dashboard')}
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted"
        >
          <Home className="w-6 h-6 mb-1 text-primary" />
          <span className="text-sm text-muted-foreground">Home</span>
        </a>
        <a
          href="/upload"
          onClick={handleNavigation('/upload')}
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted"
        >
          <Plus className="w-6 h-6 mb-1 text-primary" />
          <span className="text-sm text-muted-foreground">Add</span>
        </a>
        <a
          href="/photos"
          onClick={handleNavigation('/photos')}
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted"
        >
          <Grid className="w-6 h-6 mb-1 text-primary" />
          <span className="text-sm text-muted-foreground">All</span>
        </a>
      </div>
    </div>
  );
}

// Top Navigation - Used only in protected routes
// This ensures we only try to access Auth context when it's available
function TopNavigation() {
  const { profile, signOut } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleLogout = async () => {
    await signOut();
    setLocation("/");
  };
  
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLocation("/dashboard");
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2">
          <a href="/dashboard" onClick={handleHomeClick} className="flex items-center gap-2">
            <img src={logoImage} alt="PaintSnap" className="h-12" />
          </a>
        </div>
        
        <div className="flex items-center gap-3 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                {profile?.photoUrl ? (
                  <img 
                    src={profile.photoUrl} 
                    alt={profile?.displayName || "User"} 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="sr-only">User menu</span>
                    <User className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  {profile?.email ? (
                    <p className="text-sm font-medium leading-none">{profile.email}</p>
                  ) : (
                    <p className="text-sm font-medium leading-none">Account</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/support")}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// Email verification banner displayed when a user's email isn't verified
function EmailVerificationBanner() {
  const { user, isEmailVerified, verifyEmail } = useAuth();
  const [showBanner, setShowBanner] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // If email is verified or there's no user, don't show the banner
  if (isEmailVerified || !user || !showBanner) {
    return null;
  }
  
  const handleSendVerification = async () => {
    setIsSending(true);
    try {
      await verifyEmail();
      // Banner will stay open to show the success toast
    } catch (error) {
      console.error("Error sending verification email:", error);
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <Alert className="mb-4 border border-amber-500 bg-amber-50">
      <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between">
        <div className="flex-grow text-left mr-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <AlertDescription className="text-amber-800 font-medium">
              Please verify your email address.
            </AlertDescription>
          </div>
          <p className="text-amber-800 text-sm max-w-[700px]">
            You need to verify your email to ensure you can access all features and recover your account if needed.
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-3 sm:mt-0 self-end sm:self-center flex-shrink-0">
          <Button 
            size="sm" 
            variant="outline" 
            className="border-amber-500 text-amber-600 hover:bg-amber-100"
            onClick={handleSendVerification}
            disabled={isSending}
          >
            {isSending ? (
              <span className="flex items-center">
                <span className="animate-spin mr-1">⟳</span> Sending...
              </span>
            ) : (
              <span className="flex items-center">
                <Mail className="mr-1 h-4 w-4" /> Send verification email
              </span>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-amber-600 hover:bg-amber-100"
            onClick={() => setShowBanner(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-16">
      <TopNavigation />
      <div className="flex justify-center w-full pt-4">
        <div className="container max-w-4xl">
          <EmailVerificationBanner />
        </div>
      </div>
      {children}
      <BottomNavigation />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes - require login */}
      <ProtectedRoute path="/dashboard" component={() => {
        return (
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        );
      }} />
      
      <ProtectedRoute path="/areas" component={() => {
        return (
          <AppLayout>
            <AreasPage />
          </AppLayout>
        );
      }} />
      <ProtectedRoute path="/upload" component={() => {
        return (
          <AppLayout>
            <UploadPage />
          </AppLayout>
        );
      }} />
      <ProtectedRoute path="/photos" component={() => {
        return (
          <AppLayout>
            <AllPhotosPage />
          </AppLayout>
        );
      }} />
      <ProtectedRoute path="/areas/:id" component={() => {
        return (
          <AppLayout>
            <AreaDetailPage />
          </AppLayout>
        );
      }} />
      <ProtectedRoute path="/areas/:id/upload" component={() => {
        return (
          <AppLayout>
            <UploadPage />
          </AppLayout>
        );
      }} />
      <ProtectedRoute path="/photos/:id" component={() => {
        return (
          <AppLayout>
            <PhotoViewPage />
          </AppLayout>
        );
      }} />

      {/* Settings and Support Pages */}
      <ProtectedRoute path="/settings" component={() => {
        return (
          <AppLayout>
            <SettingsPage />
          </AppLayout>
        );
      }} />
      
      <ProtectedRoute path="/support" component={() => {
        return (
          <AppLayout>
            <SupportPage />
          </AppLayout>
        );
      }} />
      
      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Import ProjectProvider
import { ProjectProvider } from "./hooks/use-project";
import connectionManager from "./lib/connection-manager";
import { useEffect } from "react";

function App() {
  // Initialize the connection manager when the app first loads
  useEffect(() => {
    // Initialize the connection manager
    connectionManager.initialize();
    
    // Clean up on component unmount
    return () => {
      connectionManager.cleanup();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <Router />
          <Toaster />
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;