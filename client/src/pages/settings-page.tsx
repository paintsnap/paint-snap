import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "firebase/auth";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MetaHelmet } from "@/components/meta-helmet";
import { AlertCircle, Mail, Key, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  return (
    <div className="container max-w-4xl pb-8">
      <MetaHelmet 
        title="Settings | PaintSnap" 
        description="Manage your PaintSnap account settings"
      />
      
      <div className="flex flex-col items-center w-full">
        <div className="w-full max-w-3xl flex flex-col gap-6">
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          
          <EmailSettings email={profile?.email || user?.email || ""} />
          <PasswordSettings />
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}

function EmailSettings({ email }: { email: string }) {
  const [newEmail, setNewEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error("User not found");
      }
      
      // Re-authenticate user before changing email
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update email
      await updateEmail(user, newEmail);
      
      toast({
        title: "Email updated",
        description: "A confirmation email has been sent to your new address.",
        variant: "default",
      });
      
      setCurrentPassword("");
    } catch (err: any) {
      console.error("Error updating email:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Change Email Address
        </CardTitle>
        <CardDescription>
          Update your email address. You'll need to verify your new email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="newEmail">New Email Address</Label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="your-new-email@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              required
            />
          </div>
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    
    // Password strength validation
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error("User not found");
      }
      
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
        variant: "default",
      });
      
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Error updating password:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your account password. Passwords must be at least 8 characters long.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="currentPassword2">Current Password</Label>
            <Input
              id="currentPassword2"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DeleteAccountSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { signOut } = useAuth();
  
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error("User not found");
      }
      
      // Re-authenticate user before deletion
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      // Delete the user account
      await deleteUser(user);
      
      // Log out
      await signOut();
      
      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
        variant: "default",
      });
      
      // Close dialog
      setIsOpen(false);
      
      // Redirect to landing page
      window.location.href = "/";
    } catch (err: any) {
      console.error("Error deleting account:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
              Delete your account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleDeleteAccount} className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-left">
                  Confirm your password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Deleting..." : "Delete Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Helper to parse Firebase error messages into user-friendly format
function getErrorMessage(error: any): string {
  if (!error) {
    return "An unknown error occurred";
  }
  
  // Handle Firebase auth errors
  const errorCode = error.code;
  
  switch (errorCode) {
    case 'auth/wrong-password':
      return "Incorrect password. Please check your password and try again.";
    case 'auth/user-not-found':
      return "Account not found. Please check your credentials.";
    case 'auth/email-already-in-use':
      return "This email is already in use by another account.";
    case 'auth/weak-password':
      return "Your password is too weak. Please use a stronger password.";
    case 'auth/requires-recent-login':
      return "For security reasons, please sign out and sign in again before making this change.";
    case 'auth/invalid-email':
      return "Please enter a valid email address.";
    default:
      return error.message || "An unexpected error occurred. Please try again.";
  }
}