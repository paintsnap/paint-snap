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
  
  // Only apply the protection if we're actually on this route
  const isRouteActive = location === path || location.startsWith(`${path}/`);

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