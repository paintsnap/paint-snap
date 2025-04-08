import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { insertPhotoSchema, insertAnnotationSchema } from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pkg from "pg";
const { Pool } = pkg;
import { ZodError } from "zod";
import { handleZodError, requireAuth } from "./utils";
import { setupAuth } from "./auth";

// Add session type for TypeScript
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// Import route modules
import authRoutes from "./routes/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up PostgreSQL session store
  const PgStore = connectPgSimple(session);
  const sessionPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  // Create the session store
  const sessionStore = new PgStore({
    pool: sessionPool,
    createTableIfMissing: true,
  });
  
  // Log environment variables (without revealing sensitive values)
  console.log("SESSION_SECRET exists:", !!process.env.SESSION_SECRET);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  
  // Set up authentication (includes session middleware)
  setupAuth(app, sessionStore);



  // prefix all routes with /api
  const apiRouter = express.Router();
  
  // Auth routes
  apiRouter.use('/auth', authRoutes);

  // PHOTO ROUTES
  
  // Get all photos for the gallery
  apiRouter.get("/photos", async (req, res) => {
    try {
      // Get userId from session if authenticated
      const userId = req.session?.userId;
      const photos = await storage.getAllPhotos(userId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  // Get a specific photo with its annotations
  apiRouter.get("/photos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const photo = await storage.getPhotoWithAnnotations(id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      res.json(photo);
    } catch (error) {
      console.error("Error fetching photo:", error);
      res.status(500).json({ message: "Failed to fetch photo" });
    }
  });

  // Get photo image data
  apiRouter.get("/photos/:id/image", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const photo = await storage.getPhotoById(id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      // Extract image type and base64 data
      const dataUrlRegex = /^data:image\/([a-zA-Z+]+);base64,(.+)$/;
      const matches = photo.imageData.match(dataUrlRegex);
      
      if (!matches || matches.length !== 3) {
        return res.status(500).json({ message: "Invalid image data format" });
      }
      
      const imageType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.set('Content-Type', `image/${imageType}`);
      res.send(buffer);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  // Create a new photo
  apiRouter.post("/photos", requireAuth, async (req, res) => {
    try {
      // Add userId from session
      const userId = req.session!.userId!;
      const photoData = insertPhotoSchema.parse({
        ...req.body,
        userId
      });
      const newPhoto = await storage.createPhoto(photoData);
      res.status(201).json(newPhoto);
    } catch (error) {
      console.error("Error creating photo:", error);
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      res.status(500).json({ message: "Failed to create photo" });
    }
  });

  // Update a photo's name
  apiRouter.patch("/photos/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      // Get userId from session
      const userId = req.session!.userId!;

      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }

      const updatedPhoto = await storage.updatePhoto(id, name, userId);
      if (!updatedPhoto) {
        return res.status(404).json({ message: "Photo not found or you don't have permission to update it" });
      }

      res.json(updatedPhoto);
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ message: "Failed to update photo" });
    }
  });

  // Delete a photo
  apiRouter.delete("/photos/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      // Get userId from session
      const userId = req.session!.userId!;
      
      const deleted = await storage.deletePhoto(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found or you don't have permission to delete it" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // ANNOTATION ROUTES
  
  // Get all annotations for a photo
  apiRouter.get("/photos/:photoId/annotations", async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const annotations = await storage.getAnnotationsByPhotoId(photoId);
      res.json(annotations);
    } catch (error) {
      console.error("Error fetching annotations:", error);
      res.status(500).json({ message: "Failed to fetch annotations" });
    }
  });

  // Create a new annotation
  apiRouter.post("/photos/:photoId/annotations", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      // Get user ID from session
      const userId = req.session!.userId!;

      // Check if photo exists
      const photo = await storage.getPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const annotationData = insertAnnotationSchema.parse({
        ...req.body,
        photoId,
        userId
      });

      const newAnnotation = await storage.createAnnotation(annotationData);
      res.status(201).json(newAnnotation);
    } catch (error) {
      console.error("Error creating annotation:", error);
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      res.status(500).json({ message: "Failed to create annotation" });
    }
  });

  // Update an annotation
  apiRouter.patch("/annotations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }

      // Get userId from session
      const userId = req.session!.userId!;

      const { title, content } = req.body;
      if (!title || !content || typeof title !== 'string' || typeof content !== 'string') {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const updatedAnnotation = await storage.updateAnnotation(id, title, content, userId);
      if (!updatedAnnotation) {
        return res.status(404).json({ message: "Annotation not found or you don't have permission to update it" });
      }

      res.json(updatedAnnotation);
    } catch (error) {
      console.error("Error updating annotation:", error);
      res.status(500).json({ message: "Failed to update annotation" });
    }
  });

  // Delete an annotation
  apiRouter.delete("/annotations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }

      // Get userId from session
      const userId = req.session!.userId!;
      
      const deleted = await storage.deleteAnnotation(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Annotation not found or you don't have permission to delete it" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting annotation:", error);
      res.status(500).json({ message: "Failed to delete annotation" });
    }
  });

  // Delete all annotations for a photo
  apiRouter.delete("/photos/:photoId/annotations", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      // Get userId from session
      const userId = req.session!.userId!;
      
      // Check if the user owns the photo
      const photo = await storage.getPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      if (photo.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete annotations for this photo" });
      }

      await storage.deleteAllAnnotationsForPhoto(photoId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting annotations:", error);
      res.status(500).json({ message: "Failed to delete annotations" });
    }
  });

  app.use('/api', apiRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}
