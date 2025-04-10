import { useEffect } from "react";

interface MetaHelmetProps {
  title?: string;
  description?: string;
}

/**
 * Component to manage page meta tags. 
 * Changes document title and meta description for specific pages.
 */
export function MetaHelmet({ title, description }: MetaHelmetProps) {
  useEffect(() => {
    // Update the document title if provided
    if (title) {
      document.title = title;
    }

    // Update meta description if provided
    if (description) {
      // Try to find an existing description meta tag
      let metaDescription = document.querySelector('meta[name="description"]');
      
      if (metaDescription) {
        // If it exists, update its content
        metaDescription.setAttribute('content', description);
      } else {
        // If it doesn't exist, create a new one
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        metaDescription.setAttribute('content', description);
        document.head.appendChild(metaDescription);
      }
    }

    // Cleanup function to restore default title/description if needed
    return () => {
      // You could reset to default values here if needed
      // For now we'll let the next component set its own values
    };
  }, [title, description]);

  // This component doesn't render anything visible
  return null;
}