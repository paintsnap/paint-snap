import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertTriangle, ExternalLink } from "lucide-react";

export function FirebasePermissionError({ projectId }: { projectId?: string }) {
  const firebaseRulesUrl = projectId 
    ? `https://console.firebase.google.com/project/${projectId}/firestore/rules` 
    : 'https://console.firebase.google.com';

  return (
    <div className="container py-6 space-y-8">
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Firebase Security Rules Error</AlertTitle>
        <AlertDescription>
          Your Firebase security rules need to be updated to allow access to the Firestore database.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>How to Fix Firebase Permission Issues</CardTitle>
          <CardDescription>
            You're seeing this because the app received a "permission-denied" error from Firebase Firestore.
            Follow these steps to fix the issue:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 1: Open the Firebase Console</h3>
            <p>
              Go to the Firebase Console and select your project.
            </p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => window.open(firebaseRulesUrl, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Firebase Console
            </Button>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 2: Update Firestore Rules</h3>
            <p>
              Navigate to Firestore Database → Rules and replace the current rules with the following:
            </p>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write all data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              This will allow any authenticated user to read and write data to your Firestore database.
              For production, you should implement more restrictive rules.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 3: Update Storage Rules</h3>
            <p>
              Go to Storage → Rules and replace the current rules with the following:
            </p>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
{`rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
            </pre>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 4: Refresh the Application</h3>
            <p>
              After updating the rules, refresh this page to see if the issue is resolved.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}