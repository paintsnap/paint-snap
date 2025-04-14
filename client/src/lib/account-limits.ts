import { ACCOUNT_LIMITS, type UserProfile } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import React from "react";

// The premium upgrade URL
export const PREMIUM_UPGRADE_URL = "https://subscribepage.io/paintsnap";

// Helper function to check if user can create more areas
export function canCreateArea(profile: UserProfile | null, totalAreas: number): boolean {
  if (!profile) return false;
  
  const { accountType } = profile;
  const limits = accountType === 'premium' ? ACCOUNT_LIMITS.PREMIUM : ACCOUNT_LIMITS.FREE;
  
  return totalAreas < limits.MAX_AREAS;
}

// Helper function to check if user can add more photos to an area
export function canAddPhotoToArea(profile: UserProfile | null, photosInArea: number): boolean {
  if (!profile) return false;
  
  const { accountType } = profile;
  const limits = accountType === 'premium' ? ACCOUNT_LIMITS.PREMIUM : ACCOUNT_LIMITS.FREE;
  
  return photosInArea < limits.MAX_PHOTOS_PER_AREA;
}

// Helper function to check if user can add more tags to a photo
export function canAddTagToPhoto(profile: UserProfile | null, tagsInPhoto: number): boolean {
  if (!profile) return false;
  
  const { accountType } = profile;
  const limits = accountType === 'premium' ? ACCOUNT_LIMITS.PREMIUM : ACCOUNT_LIMITS.FREE;
  
  return tagsInPhoto < limits.MAX_TAGS_PER_PHOTO;
}

// Open the premium upgrade page
export function openUpgradePage() {
  window.open(PREMIUM_UPGRADE_URL, '_blank');
}

// Display warning and error messages with specific limits
export function showLimitWarning(type: 'area' | 'photo' | 'tag', current: number, max: number): void {
  const limits = ACCOUNT_LIMITS.FREE;
  
  if (current >= max) {
    let description = '';
    
    // Create specific messages for each type of limit
    if (type === 'area') {
      description = `You've reached the maximum limit of ${limits.MAX_AREAS} areas on your free account. Upgrade to Premium for unlimited areas.`;
    } else if (type === 'photo') {
      description = `You've reached the maximum limit of ${limits.MAX_PHOTOS_PER_AREA} photos in this area. Free accounts are limited to ${limits.MAX_PHOTOS_PER_AREA} photos per area. Upgrade to Premium for unlimited photos.`;
    } else if (type === 'tag') {
      description = `You've reached the maximum limit of ${limits.MAX_TAGS_PER_PHOTO} tags on this photo. Free accounts are limited to ${limits.MAX_TAGS_PER_PHOTO} tags per photo. Upgrade to Premium for unlimited tags.`;
    }
    
    toast({
      title: "Account Limit Reached",
      description,
      variant: "destructive",
      action: React.createElement(ToastAction, { 
        altText: "Upgrade", 
        onClick: () => openUpgradePage()
      }, "Upgrade"),
    });
  } else if (current >= max - 1) {
    let description = '';
    
    // Create specific messages for each type of limit
    if (type === 'area') {
      description = `You can only create ${max - current} more area on your free account (maximum ${limits.MAX_AREAS}). Upgrade to Premium for unlimited areas.`;
    } else if (type === 'photo') {
      description = `You can only add ${max - current} more photo to this area on your free account (maximum ${limits.MAX_PHOTOS_PER_AREA} per area). Upgrade to Premium for unlimited photos.`;
    } else if (type === 'tag') {
      description = `You can only add ${max - current} more tag to this photo on your free account (maximum ${limits.MAX_TAGS_PER_PHOTO} per photo). Upgrade to Premium for unlimited tags.`;
    }
    
    toast({
      title: "Approaching Account Limit",
      description,
      variant: "default",
      action: React.createElement(ToastAction, { 
        altText: "Upgrade", 
        onClick: () => openUpgradePage()
      }, "Upgrade"),
    });
  }
}

export function getRemainingLimits(profile: UserProfile | null, 
                                  areas: number, 
                                  photosInCurrentArea: number, 
                                  tagsInCurrentPhoto: number) {
  if (!profile) {
    return { areasRemaining: 0, photosRemaining: 0, tagsRemaining: 0, isPremium: false };
  }
  
  const { accountType } = profile;
  const limits = accountType === 'premium' ? ACCOUNT_LIMITS.PREMIUM : ACCOUNT_LIMITS.FREE;
  
  return {
    areasRemaining: Math.max(0, limits.MAX_AREAS - areas),
    photosRemaining: Math.max(0, limits.MAX_PHOTOS_PER_AREA - photosInCurrentArea),
    tagsRemaining: Math.max(0, limits.MAX_TAGS_PER_PHOTO - tagsInCurrentPhoto),
    isPremium: accountType === 'premium'
  };
}