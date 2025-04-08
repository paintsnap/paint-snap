import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { handleZodError } from '../utils';
import { storage } from '../storage';
import { getFirebaseAdmin } from '../firebase-admin';

const router = express.Router();

// Token schema for validation
const tokenSchema = z.object({
  token: z.string().min(1)
});

// Verify Firebase token and create or update user
router.post("/verify-token", async (req: Request, res: Response) => {
  try {
    const { token } = tokenSchema.parse(req.body);
    const auth = getFirebaseAdmin().auth();
    
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    if (!decodedToken) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const { uid, name, email, picture } = decodedToken;
    
    // Get or create user in our database
    let user = await storage.getUserByFirebaseUid(uid);
    
    if (!user) {
      // Create new user
      user = await storage.createUser({
        firebaseUid: uid,
        displayName: name || null,
        email: email || null,
        photoUrl: picture || null
      });
    }
    
    // Store user ID in session
    req.session!.userId = user.id;
    
    // Get user profile including any additional data
    const userProfile = await storage.getUserProfile(user.id);
    
    res.json({
      message: "Successfully authenticated",
      user: userProfile
    });
  } catch (error) {
    console.error("Authentication error:", error);
    if (error instanceof z.ZodError) {
      return handleZodError(error, res);
    }
    res.status(500).json({ message: "Authentication failed" });
  }
});

// Get current authenticated user
router.get("/me", async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUserProfile(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy(err => {
        if (err) console.error("Error destroying session:", err);
      });
      return res.status(401).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ message: "Failed to get user data" });
  }
});

// Logout
router.post("/logout", (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Successfully logged out" });
    });
  } else {
    res.json({ message: "No active session" });
  }
});

export default router;