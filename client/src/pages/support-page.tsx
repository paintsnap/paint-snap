import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MetaHelmet } from "@/components/meta-helmet";
import { LifeBuoy, Send, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function SupportPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Get email from profile if available
  const defaultValues: Partial<FormValues> = {
    email: profile?.email || "",
    message: "",
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const onSubmit = async (data: FormValues) => {
    try {
      // In a real app, you'd send this data to your backend
      console.log("Support form data:", data);
      
      // Simulate sending email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      toast({
        title: "Message sent",
        description: "We'll get back to you as soon as possible.",
        variant: "default",
      });
      
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting support form:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container max-w-4xl pb-8">
      <MetaHelmet 
        title="Support | PaintSnap" 
        description="Get help with your PaintSnap account"
      />
      
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              Contact Support
            </CardTitle>
            <CardDescription>
              Have a question or need help? Send us a message and we'll get back to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <SuccessMessage />
            ) : (
              <SupportForm form={form} onSubmit={onSubmit} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SupportForm({ 
  form, 
  onSubmit 
}: { 
  form: ReturnType<typeof useForm<FormValues>>, 
  onSubmit: (data: FormValues) => Promise<void> 
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your-email@example.com" {...field} />
              </FormControl>
              <FormDescription>
                We'll use this email to respond to your inquiry.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="How can we help you?" 
                  className="min-h-[120px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2">⟳</span> Sending...
              </span>
            ) : (
              <span className="flex items-center">
                <Send className="mr-2 h-4 w-4" /> Send Message
              </span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function SuccessMessage() {
  return (
    <Alert className="bg-green-50 border-green-200">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="font-medium mb-2">Thank you for your message!</div>
        <p>Your message has been sent to our support team at <strong>info@paintsnap.com</strong>. We'll get back to you as soon as possible.</p>
      </AlertDescription>
    </Alert>
  );
}