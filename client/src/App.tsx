import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { Home, Plus, Grid, LogOut, Camera } from "lucide-react";
import React from "react";

// Import our pages
import LandingPage from "@/pages/landing-page";
import DashboardPage from "@/pages/dashboard-page";
import AreasPage from "@/pages/areas-page";
import UploadPage from "@/pages/upload-page";
import AllPhotosPage from "@/pages/all-photos-page";
import AreaDetailPage from "@/pages/area-detail-page";
import PhotoViewPage from "@/pages/photo-view-page";

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
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <a href="/dashboard" onClick={handleHomeClick} className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">PaintSnap</h1>
          </a>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-2">
            {profile ? (profile.username || profile.displayName || "User") : "User"}
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-16">
      <TopNavigation />
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
      <ProtectedRoute path="/photos/:id" component={() => {
        return (
          <AppLayout>
            <PhotoViewPage />
          </AppLayout>
        );
      }} />
      
      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;