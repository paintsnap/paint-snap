import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser, sendPasswordResetEmail } from "firebase/auth";
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
import { AlertCircle, Mail, Key, Trash2, BarChart, Camera, Grid, Tag, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PREMIUM_UPGRADE_URL } from "@/lib/account-limits";

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <MetaHelmet 
        title="Settings | PaintSnap" 
        description="Manage your PaintSnap account settings"
      />
      
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Account Settings</h1>
        
        <div className="space-y-6">
          <AccountStatistics />
          <EmailSettings email={profile?.email || user?.email || ""} />
          <PasswordSettings />
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}

function AccountStatistics() {
  const { profile } = useAuth();
  
  // Fixed account limits
  const accountLimits = {
    basic: {
      maxProjects: 1,
      maxAreasPerProject: 3,
      maxPhotosPerArea: 10,
      maxTagsPerPhoto: 3
    },
    premium: {
      maxProjects: 5,
      maxAreasPerProject: 99,
      maxPhotosPerArea: 99,
      maxTagsPerPhoto: 99
    },
    pro: {
      maxProjects: 5,
      maxAreasPerProject: 99,
      maxPhotosPerArea: 99,
      maxTagsPerPhoto: 99
    }
  };
  
  // Demo statistics based on account type
  const stats = {
    projectCount: profile?.accountType === 'basic' ? 1 : 3,
    areaCount: profile?.accountType === 'basic' ? 2 : 8,
    photoCount: profile?.accountType === 'basic' ? 6 : 27,
    tagCount: profile?.accountType === 'basic' ? 9 : 45
  };
  
  // Account type styling
  const accountTypeColors = {
    basic: "bg-zinc-100 text-zinc-800",
    premium: "bg-amber-100 text-amber-800",
    pro: "bg-purple-100 text-purple-800",
  };
  
  const accountTypeLabel = (type: string) => {
    switch(type) {
      case 'premium':
        return (
          <div className="flex items-center gap-1">
            <span>Premium</span>
            <Crown className="h-4 w-4" />
          </div>
        );
      case 'pro':
        return (
          <div className="flex items-center gap-1">
            <span>Professional</span>
            <Crown className="h-4 w-4" />
          </div>
        );
      default:
        return "Basic";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Account Statistics
        </CardTitle>
        <CardDescription>
          Overview of your account usage and current plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Account Type</p>
              {profile ? (
                <Badge variant="outline" className={`text-sm py-1 px-2 font-medium ${profile.accountType && accountTypeColors[profile.accountType as keyof typeof accountTypeColors]}`}>
                  {profile.accountType ? accountTypeLabel(profile.accountType) : "Basic"}
                </Badge>
              ) : (
                <Skeleton className="h-6 w-20" />
              )}
            </div>
            
            {profile?.accountType === 'basic' && (
              <div>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  onClick={() => window.open(PREMIUM_UPGRADE_URL, '_blank')}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Premium
                </Button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
              <Grid className="mb-2 h-5 w-5 text-slate-600" />
              <p className="text-sm font-medium text-muted-foreground">Projects</p>
              <p className="text-2xl font-bold">{stats.projectCount}</p>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
              <div className="mb-2 h-5 w-5 text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/>
                  <path d="M7 14.5v-5" />
                  <path d="M11 17v-5" />
                  <path d="M15 19v-5" />
                  <path d="M19 19v-5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Areas</p>
              <p className="text-2xl font-bold">{stats.areaCount}</p>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
              <Camera className="mb-2 h-5 w-5 text-slate-600" />
              <p className="text-sm font-medium text-muted-foreground">Photos</p>
              <p className="text-2xl font-bold">{stats.photoCount}</p>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
              <Tag className="mb-2 h-5 w-5 text-slate-600" />
              <p className="text-sm font-medium text-muted-foreground">Tags</p>
              <p className="text-2xl font-bold">{stats.tagCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const [showResetOption, setShowResetOption] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
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
      
      // If authentication failed, show reset option
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-mismatch') {
        setShowResetOption(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResetPassword = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error("User not found");
      }
      
      await sendPasswordResetEmail(auth, user.email);
      
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for instructions to reset your password.",
        variant: "default",
      });
      
      setResetEmailSent(true);
    } catch (err: any) {
      console.error("Error sending password reset email:", err);
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
        {resetEmailSent ? (
          <div className="space-y-4">
            <Alert variant="default" className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                A password reset link has been sent to your email address. Please check your inbox and follow the instructions.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              onClick={() => {
                setResetEmailSent(false);
                setShowResetOption(false);
              }}
            >
              Return to password form
            </Button>
          </div>
        ) : (
          <div>
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
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Password"}
                </Button>
                
                {showResetOption && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleResetPassword}
                    disabled={isSubmitting}
                  >
                    Forgot Password? Send Reset Email
                  </Button>
                )}
              </div>
            </form>
            
            {!showResetOption && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Can't remember your current password?</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowResetOption(true)}
                >
                  Reset Password via Email
                </Button>
              </div>
            )}
          </div>
        )}
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