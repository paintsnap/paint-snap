import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { profile, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Check if the current path matches our route pattern
  const isRouteActive = (() => {
    // For routes with parameters like '/areas/:id'
    if (path.includes(':')) {
      // Extract the base path (e.g., '/areas/' from '/areas/:id')
      const basePath = path.split(':')[0];
      return location.startsWith(basePath);
    }
    // For exact routes or routes with potential children
    return location === path || location.startsWith(`${path}/`);
  })();
  
  console.log(`Protected route check: Path=${path}, Location=${location}, isActive=${isRouteActive}`);

  return (
    <Route path={path}>
      {isRouteActive ? (
        isLoading ? (
          // Show loading spinner while checking auth
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !profile ? (
          // Redirect to auth page if not authenticated
          <Redirect to="/auth" />
        ) : (
          // Render the protected component if authenticated
          <Component />
        )
      ) : null}
    </Route>
  );
}