import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Camera, LogIn, Mail, User, KeyRound, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";

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

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Left side - Authentication forms */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-6 w-6 text-[#2196F3]" />
              <h2 className="text-xl font-semibold text-center">PaintSnap</h2>
            </div>
            <CardTitle className="text-2xl font-bold">
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
                className={activeTab === "login" ? "bg-[#2196F3] hover:bg-blue-600" : ""}
              >
                Sign In
              </Button>
              <Button 
                type="button" 
                variant={activeTab === "register" ? "default" : "outline"}
                onClick={() => setActiveTab("register")}
                className={activeTab === "register" ? "bg-[#2196F3] hover:bg-blue-600" : ""}
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
                      className="w-full bg-[#2196F3] hover:bg-blue-600"
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
                
                {/* Google Sign-In button removed as requested but was still being referenced in code */}
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
                      className="w-full bg-[#2196F3] hover:bg-blue-600"
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
      <div className="hidden md:flex flex-1 p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white flex-col justify-center px-12">
        <div className="max-w-md mx-auto">
          <Camera className="h-16 w-16 mb-6" />
          <h1 className="text-4xl font-bold mb-4">PaintSnap</h1>
          <p className="text-xl mb-8">
            Document your interior designs with precision annotations and detailed notes directly on your photos.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded-full mr-4">
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
              <div className="bg-white/20 p-2 rounded-full mr-4">
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
                <h3 className="font-medium text-lg">Organized Gallery</h3>
                <p className="text-white/80">Keep all your annotated photos organized in one place</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded-full mr-4">
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