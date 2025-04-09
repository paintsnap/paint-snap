import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Camera, Palette, Home, Pin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { profile, isLoading } = useAuth();
  
  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (profile && !isLoading) {
      navigate("/dashboard");
    }
  }, [profile, isLoading, navigate]);
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">PaintSnap</span>
          </div>
          <div className="flex gap-4">
            <Button 
              variant="ghost"
              onClick={() => navigate("/auth")}
            >
              Log in
            </Button>
            <Button
              onClick={() => navigate("/auth?tab=register")}
            >
              Sign up
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Document Your Interior Designs with Precision
            </h1>
            <p className="text-lg text-muted-foreground">
              PaintSnap helps you keep track of paint colors, materials, and design elements with precise photo annotations and organized areas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="px-8"
                onClick={() => navigate("/auth?tab=register")}
              >
                Start For Free
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate("/auth")}
              >
                Log in
              </Button>
            </div>
          </div>
          <div className="flex-1 rounded-lg overflow-hidden shadow-xl">
            <img 
              src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1030&q=80" 
              alt="Interior design" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Simplify Your Design Documentation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Pin className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Precise Annotations</h3>
              <p className="text-muted-foreground">
                Mark specific spots on your photos and add detailed notes about paint colors, materials, and measurements.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Home className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Organized by Areas</h3>
              <p className="text-muted-foreground">
                Group your photos by rooms or areas to keep everything organized and easy to find when you need it.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Palette className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Design Details</h3>
              <p className="text-muted-foreground">
                Store important details like paint codes, fabric types, and vendor information all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-xl font-bold mb-2">Upload Photos</h3>
              <p className="text-muted-foreground">
                Take photos of your rooms or spaces and upload them to your project.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-xl font-bold mb-2">Add Annotations</h3>
              <p className="text-muted-foreground">
                Mark specific points on your photos and add detailed notes about each element.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-xl font-bold mb-2">Access Anywhere</h3>
              <p className="text-muted-foreground">
                Retrieve your design information whenever you need it, from any device.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Document Your Designs?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join PaintSnap today and start creating organized, detailed documentation for your interior design projects.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="px-8"
            onClick={() => navigate("/auth?tab=register")}
          >
            Get Started Now
          </Button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="mt-auto py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Camera className="h-5 w-5 text-primary" />
              <span className="font-bold">PaintSnap</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PaintSnap. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}