import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetaHelmet } from "@/components/meta-helmet";
import { LifeBuoy, Mail, HelpCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SupportPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const supportEmail = "info@paintsnap.com";
  
  // Prepare mailto link with user's email in the body if available
  const getMailtoLink = () => {
    const subject = encodeURIComponent("PaintSnap Support Request");
    const body = profile?.email 
      ? encodeURIComponent(`\n\n\n--\nSent from PaintSnap by ${profile.email}`)
      : '';
    return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };
  
  // Show toast when copying email to clipboard
  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(supportEmail);
    toast({
      title: "Email copied to clipboard",
      description: `${supportEmail} has been copied to your clipboard.`,
    });
  };
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <MetaHelmet 
        title="Support | PaintSnap" 
        description="Get help with your PaintSnap account"
      />
      
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Support</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              Contact Support
            </CardTitle>
            <CardDescription>
              Have a question or need help? Send us an email and we'll get back to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Support description */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <div className="flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">How can we help?</h3>
                  <p className="text-slate-700 text-sm mb-3">
                    Our support team is ready to assist you with any questions or issues you may have about using PaintSnap. 
                    Simply send an email to our support team using the button below.
                  </p>
                  <p className="text-slate-700 text-sm">
                    Common support topics:
                  </p>
                  <ul className="text-sm text-slate-700 list-disc list-inside mt-1 space-y-1">
                    <li>Account settings and profile information</li>
                    <li>Issues with uploading or managing photos</li>
                    <li>Questions about premium features</li>
                    <li>Suggestions for improvement</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Contact options */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Email button */}
              <Button 
                className="flex-1"
                onClick={() => window.location.href = getMailtoLink()}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Support
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
              
              {/* Copy email button */}
              <Button 
                variant="outline"
                className="flex-1"
                onClick={copyEmailToClipboard}
              >
                Copy Email Address
              </Button>
            </div>
            
            {/* Support email display */}
            <div className="text-center pt-2">
              <p className="text-sm text-slate-600">
                Support Email: <span className="font-medium">{supportEmail}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Response time: Within 1-2 business days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}