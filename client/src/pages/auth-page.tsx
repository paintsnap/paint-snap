import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LogIn, Mail, User, KeyRound, AlertCircle, Loader2 } from "lucide-react";
import logoIcon from "@assets/PaintSnap-Icon.png";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { MetaHelmet } from "@/components/meta-helmet";

// Define the schemas for login and register forms
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { profile, isLoading, error, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  // Silently test Firestore connection without showing toasts
  useEffect(() => {
    const testFirestore = async () => {
      try {
        // Instead of trying to access a collection (which might have permission issues before login),
        // just check if we can connect to Firestore at all
        console.log("Firestore connection test initiated");
        
        // Try a simple API call that doesn't require permissions
        await Promise.race([
          // Attempt to ping Firestore with a timeout
          fetch(`https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com/.json?shallow=true`, 
            { method: 'GET', mode: 'no-cors' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        
        console.log("Firestore connectivity check successful!");
        // No toast for successful connection - only log it
      } catch (error) {
        console.error("Firebase connectivity test failed:", error);
        // No toast for failed connection - only log it
      }
    };
    
    testFirestore();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (profile && !isLoading) {
      setLocation("/dashboard");
    }
  }, [profile, isLoading, setLocation]);

  // Setup login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Setup register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Handle login form submission
  const onLoginSubmit = async (values: LoginFormValues) => {
    await signInWithEmail(values.email, values.password);
  };

  // Handle register form submission
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    // Generate a display name from the email (use part before @)
    const displayName = values.email.split('@')[0];
    await signUpWithEmail(values.email, values.password, displayName);
  };

  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot-password">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Get the sendPasswordReset function from auth context
  const { sendPasswordReset } = useAuth();

  // Handle forgot password submission
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    setIsResetting(true);
    try {
      await sendPasswordReset(resetEmail);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists with this email, you'll receive instructions to reset your password.",
      });
      // Return to login tab after successful password reset request
      setActiveTab("login");
    } catch (error) {
      console.error("Password reset error:", error);
      // Error handling is already done in the hook
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col md:flex-row">
      <MetaHelmet 
        title="Log In or Create Your PaintSnap Account – Start Tracking Your Paint Projects"
        description="Access your paint records and add new photos in seconds. Log in or sign up to start organising your spaces with PaintSnap—your smart paint memory tool."
      />
      {/* Left side - Authentication forms */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-[var(--color-primary-light)] shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <img src={logoIcon} alt="PaintSnap" className="h-8 w-8" />
              <h2 className="text-xl font-semibold text-center text-[var(--color-primary)]">PaintSnap</h2>
            </div>
            <CardTitle className="text-2xl">
              Welcome
            </CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Custom Tab Navigation */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <Button 
                type="button" 
                variant={activeTab === "login" ? "default" : "outline"} 
                onClick={() => setActiveTab("login")}
                className={activeTab === "login" ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90" : ""}
              >
                Sign In
              </Button>
              <Button 
                type="button" 
                variant={activeTab === "register" ? "default" : "outline"}
                onClick={() => setActiveTab("register")}
                className={activeTab === "register" ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90" : ""}
              >
                Register
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            {activeTab === "login" && (
              <div className="space-y-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                              <Input type="email" placeholder="example@email.com" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                              <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Please wait
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-2 text-center">
                  <button 
                    type="button" 
                    onClick={() => setActiveTab("forgot-password")}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}
            
            {/* Forgot Password Form */}
            {activeTab === "forgot-password" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-center">Reset Your Password</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email address and we'll send you instructions to reset your password.
                </p>
                
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="reset-email" className="text-sm font-medium">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="example@email.com"
                        className="pl-10"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isResetting}
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90"
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Instructions"
                    )}
                  </Button>
                  
                  <div className="text-center mt-4">
                    <button 
                      type="button" 
                      onClick={() => setActiveTab("login")}
                      className="text-sm text-gray-600 hover:text-[var(--color-primary)]"
                    >
                      ← Back to sign in
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Register Form */}
            {activeTab === "register" && (
              <div className="space-y-4">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                              <Input type="email" placeholder="example@email.com" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Your username will be created from your email address
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                              <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Password must be at least 6 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                              <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Right side - Hero section */}
      <div className="hidden md:flex flex-1 p-6 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] text-white flex-col justify-center px-12">
        <div className="max-w-md mx-auto">
          <img src={logoIcon} alt="PaintSnap" className="h-24 w-24 mb-6" />
          <h1 className="text-4xl mb-4">PaintSnap</h1>
          <p className="text-xl mb-8">
            Document your interior designs with precision annotations and detailed notes directly on your photos.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-[var(--color-accent)] p-2 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-lg">Precise Annotation</h3>
                <p className="text-white/80">Add markers to specific locations on your photos with detailed notes</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-[var(--color-accent)] p-2 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-lg">Organised Gallery</h3>
                <p className="text-white/80">Keep all your annotated photos organised in one place</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-[var(--color-accent)] p-2 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-lg">Secure Storage</h3>
                <p className="text-white/80">All your data is securely stored and accessible only to you</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}