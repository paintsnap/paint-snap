import { ACCOUNT_LIMITS, type UserProfile } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import React from "react";

// The premium upgrade URL
export const PREMIUM_UPGRADE_URL = "https://subscribepage.io/paintsnap";

// Helper function to get the appropriate limits for the user's account type
export function getLimitsForUser(profile: UserProfile | null) {
  if (!profile) return ACCOUNT_LIMITS.BASIC;
  
  const { accountType } = profile;
  if (accountType === 'premium') return ACCOUNT_LIMITS.PREMIUM;
  if (accountType === 'pro') return ACCOUNT_LIMITS.PRO;
  return ACCOUNT_LIMITS.BASIC;
}

// Helper function to check if user can create more projects
export function canCreateProject(profile: UserProfile | null, totalProjects: number): boolean {
  if (!profile) return false;
  
  const limits = getLimitsForUser(profile);
  return totalProjects < limits.MAX_PROJECTS;
}

// Helper function to check if user can create more areas in a project
export function canCreateArea(profile: UserProfile | null, totalAreas: number): boolean {
  if (!profile) return false;
  
  const limits = getLimitsForUser(profile);
  return totalAreas < limits.MAX_AREAS_PER_PROJECT;
}

// Helper function to check if user can add more photos to an area
export function canAddPhotoToArea(profile: UserProfile | null, photosInArea: number): boolean {
  if (!profile) return false;
  
  const limits = getLimitsForUser(profile);
  return photosInArea < limits.MAX_PHOTOS_PER_AREA;
}

// Helper function to check if user can add more tags to a photo
export function canAddTagToPhoto(profile: UserProfile | null, tagsInPhoto: number): boolean {
  if (!profile) return false;
  
  const limits = getLimitsForUser(profile);
  return tagsInPhoto < limits.MAX_TAGS_PER_PHOTO;
}

// Helper function to check if user can export PDF
export function canExportPDF(profile: UserProfile | null): boolean {
  if (!profile) return false;
  
  const limits = getLimitsForUser(profile);
  return limits.ALLOW_PDF_EXPORT;
}

// Helper function to check if user has premium features
export function hasPremiumFeatures(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.accountType === 'premium' || profile.accountType === 'pro';
}

// Open the premium upgrade page
export function openUpgradePage() {
  window.open(PREMIUM_UPGRADE_URL, '_blank');
}

// Display warning and error messages with specific limits
export function showLimitWarning(type: 'project' | 'area' | 'photo' | 'tag', current: number, max: number): void {
  const basicLimits = ACCOUNT_LIMITS.BASIC;
  const premiumLimits = ACCOUNT_LIMITS.PREMIUM;
  
  if (current >= max) {
    let description = '';
    
    // Create specific messages for each type of limit
    if (type === 'project') {
      description = `You've reached the maximum limit of ${basicLimits.MAX_PROJECTS} project on your basic account. Upgrade to Premium for up to ${premiumLimits.MAX_PROJECTS} projects.`;
    } else if (type === 'area') {
      description = `You've reached the maximum limit of ${basicLimits.MAX_AREAS_PER_PROJECT} areas per project on your basic account. Upgrade to Premium for up to ${premiumLimits.MAX_AREAS_PER_PROJECT} areas per project.`;
    } else if (type === 'photo') {
      description = `You've reached the maximum limit of ${basicLimits.MAX_PHOTOS_PER_AREA} photos in this area. Basic accounts are limited to ${basicLimits.MAX_PHOTOS_PER_AREA} photos per area. Upgrade to Premium for up to ${premiumLimits.MAX_PHOTOS_PER_AREA} photos per area.`;
    } else if (type === 'tag') {
      description = `You've reached the maximum limit of ${basicLimits.MAX_TAGS_PER_PHOTO} tags on this photo. Basic accounts are limited to ${basicLimits.MAX_TAGS_PER_PHOTO} tags per photo. Upgrade to Premium for up to ${premiumLimits.MAX_TAGS_PER_PHOTO} tags per photo.`;
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
    if (type === 'project') {
      description = `You can only create ${max - current} more project on your basic account (maximum ${basicLimits.MAX_PROJECTS}). Upgrade to Premium for up to ${premiumLimits.MAX_PROJECTS} projects.`;
    } else if (type === 'area') {
      description = `You can only create ${max - current} more area in this project on your basic account (maximum ${basicLimits.MAX_AREAS_PER_PROJECT}). Upgrade to Premium for up to ${premiumLimits.MAX_AREAS_PER_PROJECT} areas per project.`;
    } else if (type === 'photo') {
      description = `You can only add ${max - current} more photo to this area on your basic account (maximum ${basicLimits.MAX_PHOTOS_PER_AREA} per area). Upgrade to Premium for up to ${premiumLimits.MAX_PHOTOS_PER_AREA} photos per area.`;
    } else if (type === 'tag') {
      description = `You can only add ${max - current} more tag to this photo on your basic account (maximum ${basicLimits.MAX_TAGS_PER_PHOTO} per photo). Upgrade to Premium for up to ${premiumLimits.MAX_TAGS_PER_PHOTO} tags per photo.`;
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
                                  projects: number = 0,
                                  areas: number = 0, 
                                  photosInCurrentArea: number = 0, 
                                  tagsInCurrentPhoto: number = 0) {
  if (!profile) {
    return { 
      projectsRemaining: 0,
      areasRemaining: 0, 
      photosRemaining: 0, 
      tagsRemaining: 0, 
      isPremiumOrPro: false,
      canExportPDF: false
    };
  }
  
  const limits = getLimitsForUser(profile);
  const isPremiumOrPro = profile.accountType === 'premium' || profile.accountType === 'pro';
  
  return {
    projectsRemaining: Math.max(0, limits.MAX_PROJECTS - projects),
    areasRemaining: Math.max(0, limits.MAX_AREAS_PER_PROJECT - areas),
    photosRemaining: Math.max(0, limits.MAX_PHOTOS_PER_AREA - photosInCurrentArea),
    tagsRemaining: Math.max(0, limits.MAX_TAGS_PER_PHOTO - tagsInCurrentPhoto),
    isPremiumOrPro,
    canExportPDF: limits.ALLOW_PDF_EXPORT
  };
}