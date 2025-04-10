import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Palette, Home, Pin, Camera } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
// Import background image and logos
import backgroundImage from "@assets/background-room.jpg";
import logoImageLight from "@assets/PaintSnap-Full-Logo-light-sm.png";
import logoImage from "@assets/PaintSnap-Full-Logo-sm.png";

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
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={logoImageLight} alt="PaintSnap" className="h-8" />
          </div>
          <div className="flex gap-4">
            <Button 
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="text-white hover:bg-white/10"
            >
              Log in
            </Button>
            <Button
              onClick={() => navigate("/auth?tab=register")}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90"
            >
              Sign up
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative py-32 md:py-48 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={backgroundImage} 
            alt="Room interior with blue walls and leather sofa" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30"></div> {/* Dark overlay for better text visibility */}
        </div>
        
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-2xl space-y-6 text-white">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight drop-shadow-md">
              Never forget your paint colours again.
            </h1>
            <p className="text-lg text-white/90">
              PaintSnap keeps a visual record of every wall, finish and detail — so you don't have to.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="px-8 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90"
                onClick={() => navigate("/auth?tab=register")}
              >
                Start For Free
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20"
                onClick={() => navigate("/auth")}
              >
                Log in
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Lead Copy Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Whether you own one home or manage dozens, PaintSnap makes it effortless to track what's been painted, where, and with what. No more scraps of paper. No more guesswork. Just snap, tag, and get on with your day.
            </p>
          </div>
          
          <h2 className="text-3xl font-bold text-center mb-12">Who it's for</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* For Homeowners */}
            <div className="bg-card p-6 rounded-lg border border-[var(--color-accent)]/20 shadow-sm hover:border-[var(--color-accent)]/50 hover:shadow-md transition-all">
              <div className="rounded-full bg-[var(--color-accent)]/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Home className="text-[var(--color-accent)] h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">For Homeowners</h3>
              <p className="text-muted-foreground">
                Make it easy to love your space — and keep it looking great. PaintSnap helps you remember the details so you can focus on the big picture.
              </p>
            </div>
            
            {/* For Landlords */}
            <div className="bg-card p-6 rounded-lg border border-[var(--color-accent)]/20 shadow-sm hover:border-[var(--color-accent)]/50 hover:shadow-md transition-all">
              <div className="rounded-full bg-[var(--color-accent)]/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Palette className="text-[var(--color-accent)] h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">For Landlords & Property Managers</h3>
              <p className="text-muted-foreground">
                Quickly reference colours, finishes and maintenance history across every property you manage — from one simple dashboard.
              </p>
            </div>
            
            {/* For Professionals */}
            <div className="bg-card p-6 rounded-lg border border-[var(--color-accent)]/20 shadow-sm hover:border-[var(--color-accent)]/50 hover:shadow-md transition-all">
              <div className="rounded-full bg-[var(--color-accent)]/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Pin className="text-[var(--color-accent)] h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">For Professional Decorators</h3>
              <p className="text-muted-foreground">
                Deliver a better service. Keep a visual log of every job, and give clients peace of mind for future touch-ups or redecorations.
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
              <div className="rounded-full bg-[var(--color-accent)] text-white w-10 h-10 flex items-center justify-center mb-4 shadow-sm">
                1
              </div>
              <h3 className="text-xl font-bold mb-2">Snap a photo</h3>
              <p className="text-muted-foreground">
                Take a quick pic of the painted surface — it can be the wall, the tin, or the finish.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-[var(--color-accent)] text-white w-10 h-10 flex items-center justify-center mb-4 shadow-sm">
                2
              </div>
              <h3 className="text-xl font-bold mb-2">Tag the paint</h3>
              <p className="text-muted-foreground">
                Add the colour, type and finish. Include notes like "needs retouching in 2 years" or "last painted in June 2024".
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-[var(--color-accent)] text-white w-10 h-10 flex items-center justify-center mb-4 shadow-sm">
                3
              </div>
              <h3 className="text-xl font-bold mb-2">Done.</h3>
              <p className="text-muted-foreground">
                Everything's stored by Area (e.g. Living Room, Front of House) so it's easy to find later. No mess, no stress.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Why People Love It */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why people love it</h2>
          
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-start gap-3">
              <div className="text-[var(--color-accent)] mt-1 text-xl">✓</div>
              <p className="text-lg">Super simple — takes seconds to use</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-[var(--color-accent)] mt-1 text-xl">✓</div>
              <p className="text-lg">Visual, not fiddly — no clunky spreadsheets</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-[var(--color-accent)] mt-1 text-xl">✓</div>
              <p className="text-lg">All in one place — no more digging through emails and notes</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Forget the guesswork. Keep the look.</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            PaintSnap is the easiest way to stay in control of your home's finish — or your client's.
            Sign up and start using it now — it's completely free to try.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="px-8 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
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
              <img src={logoImage} alt="PaintSnap" className="h-6" />
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