import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface DataErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function DataError({ 
  message = "Unable to load content", 
  onRetry 
}: DataErrorProps) {
  return (
    <div className="container mx-auto p-6">
      <div className="bg-muted p-6 rounded-lg flex flex-col items-center text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{message}</h3>
        <p className="text-muted-foreground mb-4">
          There was a problem connecting to our service. Please try again.
        </p>
        {onRetry && (
          <Button onClick={onRetry} className="flex items-center">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}