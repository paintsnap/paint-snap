import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { Home, Plus, Grid } from "lucide-react";

// Import our pages
import AreasPage from "@/pages/areas-page";
import UploadPage from "@/pages/upload-page";
import AllPhotosPage from "@/pages/all-photos-page";
import AreaDetailPage from "@/pages/area-detail-page";
import PhotoViewPage from "@/pages/photo-view-page";

// Navigation component for mobile/desktop
function BottomNavigation() {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
      <div className="grid h-full grid-cols-3 mx-auto">
        <a
          href="/"
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted"
        >
          <Home className="w-6 h-6 mb-1 text-primary" />
          <span className="text-sm text-muted-foreground">Home</span>
        </a>
        <a
          href="/upload"
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted"
        >
          <Plus className="w-6 h-6 mb-1 text-primary" />
          <span className="text-sm text-muted-foreground">Add</span>
        </a>
        <a
          href="/photos"
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted"
        >
          <Grid className="w-6 h-6 mb-1 text-primary" />
          <span className="text-sm text-muted-foreground">All</span>
        </a>
      </div>
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-16">
      {children}
      <BottomNavigation />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth route - accessible without login */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes - require login */}
      <ProtectedRoute path="/" component={() => 
        <AppLayout>
          <AreasPage />
        </AppLayout>
      } />
      <ProtectedRoute path="/upload" component={() => 
        <AppLayout>
          <UploadPage />
        </AppLayout>
      } />
      <ProtectedRoute path="/photos" component={() => 
        <AppLayout>
          <AllPhotosPage />
        </AppLayout>
      } />
      <ProtectedRoute path="/areas/:id" component={() => 
        <AppLayout>
          <AreaDetailPage />
        </AppLayout>
      } />
      <ProtectedRoute path="/photos/:id" component={() => 
        <AppLayout>
          <PhotoViewPage />
        </AppLayout>
      } />
      
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