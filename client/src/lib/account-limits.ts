import { ACCOUNT_LIMITS, type UserProfile } from "@shared/schema";
import { toast } from "@/hooks/use-toast";

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

// Display warning and error messages
export function showLimitWarning(type: 'area' | 'photo' | 'tag', current: number, max: number): void {
  if (current >= max) {
    toast({
      title: "Account Limit Reached",
      description: `You've reached the maximum number of ${type}s allowed on your free account. Upgrade to Premium for unlimited ${type}s.`,
      variant: "destructive",
      action: {
        label: "Upgrade",
        onClick: () => openUpgradePage()
      }
    });
  } else if (current >= max - 1) {
    toast({
      title: "Approaching Account Limit",
      description: `You can only create ${max - current} more ${type}(s) on your free account. Upgrade to Premium for unlimited ${type}s.`,
      variant: "warning",
      action: {
        label: "Upgrade",
        onClick: () => openUpgradePage()
      }
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