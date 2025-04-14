import { auth, db } from './firebase';
import { queryClient } from './queryClient';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Manages application connectivity and handles recovery from connection issues
 * or when returning from background/idle state
 */
class ConnectionManager {
  private visibilityChangeHandler: () => void;
  private onlineStateHandler: () => void;
  private lastActivityTimestamp: number;
  private readonly ACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  
  constructor() {
    this.visibilityChangeHandler = this.handleVisibilityChange.bind(this);
    this.onlineStateHandler = this.handleOnlineStateChange.bind(this);
    this.lastActivityTimestamp = Date.now();
    
    // Setup listeners for user activity
    this.setupActivityTracking();
  }

  /**
   * Initialize the connection manager
   */
  public initialize(): void {
    // Add visibility change listener
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    
    // Add online/offline listener
    window.addEventListener('online', this.onlineStateHandler);
    window.addEventListener('offline', this.onlineStateHandler);
    
    console.log('Connection manager initialized');
  }

  /**
   * Clean up event listeners
   */
  public cleanup(): void {
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    window.removeEventListener('online', this.onlineStateHandler);
    window.removeEventListener('offline', this.onlineStateHandler);
  }

  /**
   * Setup tracking for user activity
   */
  private setupActivityTracking(): void {
    // Track activity to determine when the user has been inactive
    const updateActivity = () => {
      this.lastActivityTimestamp = Date.now();
    };

    // Track mouse and keyboard activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);
  }

  /**
   * Handle visibility change events (when the user returns to the tab)
   */
  private async handleVisibilityChange(): Promise<void> {
    // Only act when the page becomes visible
    if (document.visibilityState === 'visible') {
      console.log('Tab became visible, checking connection state');
      
      const inactiveTime = Date.now() - this.lastActivityTimestamp;
      
      // If user has been inactive for a while, perform reconnection
      if (inactiveTime > this.ACTIVITY_TIMEOUT) {
        console.log(`User inactive for ${inactiveTime / 1000} seconds. Refreshing data.`);
        this.refreshApplicationState();
      }
    }
  }

  /**
   * Handle online/offline state changes
   */
  private handleOnlineStateChange(): Promise<void> {
    if (navigator.onLine) {
      console.log('Application is back online. Refreshing data.');
      return this.refreshApplicationState();
    } else {
      console.log('Application is offline. Waiting for connection to return.');
      return Promise.resolve();
    }
  }

  /**
   * Refresh application state when reconnecting
   */
  private async refreshApplicationState(): Promise<void> {
    try {
      // Check if we have a current user
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Force token refresh
        try {
          await currentUser.getIdToken(true);
          console.log('Firebase token refreshed successfully');
        } catch (error) {
          console.error('Error refreshing Firebase token:', error);
        }
        
        // Test Firestore connection with a simple read
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await getDoc(userRef);
          console.log('Firestore connection verified');
        } catch (error) {
          console.error('Firestore connection test failed:', error);
        }
      }
      
      // Invalidate and refetch all queries to get fresh data
      await queryClient.invalidateQueries();
      console.log('QueryClient cache invalidated, fetching fresh data');
      
      // Update the last activity timestamp
      this.lastActivityTimestamp = Date.now();
    } catch (error) {
      console.error('Error refreshing application state:', error);
    }
  }
}

// Create singleton instance
const connectionManager = new ConnectionManager();

export default connectionManager;