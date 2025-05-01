import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { handleZodError } from '../utils';
import { storage } from '../storage';
import { getFirebaseAdmin } from '../firebase-admin';
import passport from 'passport';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { ZodError } from "zod";
import { User as SchemaUser } from '@shared/schema';

// Extend the Express.User interface in its own file
declare global {
  namespace Express {
    interface User extends SchemaUser {}
  }
}

const router = express.Router();

// Password hashing utilities
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Token schema for validation
const tokenSchema = z.object({
  token: z.string().min(1)
});

// Register endpoint
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" });
    }
    
    // Check for existing user
    const existingByUsername = await storage.getUserByUsername(username);
    if (existingByUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }
    
    const existingByEmail = await storage.getUserByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }
    
    // Create user with hashed password
    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username,
    });
    
    // Store user ID in session
    req.session!.userId = user.id;
    console.log("User ID stored in session after registration:", user.id);
    
    // Log in the new user
    req.login(user, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({ message: "Registration successful but login failed" });
      }
      
      // Get user profile and return
      return res.status(201).json({ 
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof ZodError) {
      return handleZodError(error, res);
    }
    return res.status(500).json({ message: "Failed to register user" });
  }
});

// Login endpoint
router.post("/login", (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("local", (err: Error, user: any, info: { message: string }) => {
    if (err) {
      console.error("Error in passport authentication:", err);
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({ message: info?.message || "Authentication failed" });
    }
    
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error("Login error:", loginErr);
        return next(loginErr);
      }
      
      // Store user ID in session
      req.session!.userId = user.id;
      console.log("User ID stored in session after login:", user.id);
      
      // Return user data
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username
      });
    });
  })(req, res, next);
});

// Verify Firebase token and create or update user
router.post("/verify-token", async (req: Request, res: Response) => {
  try {
    // Validate input
    const { token } = tokenSchema.parse(req.body);
    
    // Get Firebase Auth instance
    const auth = getFirebaseAdmin().auth();
    console.log("Firebase auth instance initialized");
    
    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
      console.log("Token verified successfully, uid:", decodedToken.uid);
    } catch (verifyError: any) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({ 
        message: "Invalid token", 
        details: verifyError.message || "Unknown verification error"
      });
    }
    
    if (!decodedToken || !decodedToken.uid) {
      console.error("Token verification returned invalid data");
      return res.status(401).json({ message: "Invalid token data" });
    }

    const { uid } = decodedToken;
    
    // Get the user information from Firebase
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
      console.log("Firebase user retrieved:", userRecord.uid);
    } catch (userError: any) {
      console.error("Error fetching user data from Firebase:", userError);
      return res.status(404).json({ 
        message: "User not found in Firebase", 
        details: userError.message || "Unknown Firebase error"
      });
    }
    
    const { displayName, email, photoURL } = userRecord;
    console.log("User data:", { uid, displayName, email, hasPhoto: !!photoURL });
    
    // Get or create user in our database
    let user = await storage.getUserByFirebaseUid(uid);
    
    if (!user) {
      console.log("Creating new user in database");
      // Create new user
      user = await storage.createUser({
        firebaseUid: uid,
        displayName: displayName || null,
        email: email || null,
        photoUrl: photoURL || null
      });
      console.log("New user created with ID:", user.id);
    } else {
      console.log("Existing user found with ID:", user.id);
    }
    
    // Store user ID in session
    req.session!.userId = user.id;
    console.log("User ID stored in session:", user.id);
    
    // Log in the user with Passport
    req.login(user, async (err) => {
      if (err) {
        console.error("Passport login error:", err);
        return res.status(500).json({ message: "Authentication successful but session creation failed" });
      }
      
      // Save session manually to ensure it's committed
      await new Promise<void>((resolve, reject) => {
        req.session!.save((err) => {
          if (err) {
            console.error("Failed to save session:", err);
            reject(err);
          } else {
            console.log("Session saved successfully");
            resolve();
          }
        });
      });
      
      // Get user profile including any additional data
      const userProfile = await storage.getUserProfile(user.id);
      
      res.json(userProfile);
    });
  } catch (error) {
    console.error("Authentication error:", error);
    if (error instanceof z.ZodError) {
      return handleZodError(error, res);
    }
    // Provide more detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ 
      message: "Authentication failed", 
      details: errorMessage 
    });
  }
});

// Get current authenticated user
router.get("/user", (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const user = req.user as any;
  console.log("Current authenticated user:", user.id);
  
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    photoUrl: user.photoUrl
  });
});

// Legacy endpoint - redirects to /user
router.get("/me", (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() && !req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Just call the /user endpoint handler directly
  res.redirect("/api/auth/user");
});

// Logout endpoint
router.post("/logout", (req: Request, res: Response) => {
  const userId = req.user ? (req.user as any).id : req.session?.userId;
  console.log("Logging out user:", userId);
  
  req.logout(function(err) {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Error during logout" });
    }
    
    // Also destroy the session
    req.session?.destroy(sessErr => {
      if (sessErr) {
        console.error("Error destroying session:", sessErr);
      }
      console.log("User logged out successfully");
      res.json({ message: "Logged out successfully" });
    });
  });
});

// Admin endpoint to update a user's account type
// For security, in a production app this would require proper authorization
router.post("/update-account-type", async (req: Request, res: Response) => {
  try {
    const { userId, accountType } = req.body;
    
    if (!userId || !accountType) {
      return res.status(400).json({ message: "userId and accountType are required" });
    }
    
    // Validate accountType
    if (!['basic', 'premium', 'pro'].includes(accountType)) {
      return res.status(400).json({ message: "accountType must be one of: basic, premium, pro" });
    }
    
    // Convert userId to number if it's a string
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid userId" });
    }
    
    // Check if user exists
    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update user's account type
    const updatedUser = await storage.updateUserAccountType(id, accountType);
    
    if (!updatedUser) {
      return res.status(500).json({ message: "Failed to update user account type" });
    }
    
    // Return success
    res.json({ 
      message: "User account type updated successfully",
      user: {
        id: updatedUser.id,
        accountType: updatedUser.accountType
      }
    });
  } catch (error) {
    console.error("Error updating account type:", error);
    res.status(500).json({ message: "Failed to update user account type" });
  }
});

// Get user statistics
router.get("/user-stats", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = (req.user as any).id;
    
    // Get user stats
    const stats = await storage.getUserStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: "Failed to fetch user statistics" });
  }
});

export default router;