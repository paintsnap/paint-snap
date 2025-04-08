import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { insertPhotoSchema, insertTagSchema, insertAreaSchema } from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pkg from "pg";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
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

  // Set up file uploads with multer
  const storage = multer.memoryStorage();
  const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // prefix all routes with /api
  const apiRouter = express.Router();
  
  // Auth routes
  apiRouter.use('/auth', authRoutes);

  // AREA ROUTES
  
  // Get all areas for the current user
  apiRouter.get("/areas", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const areas = await storage.getAreas(userId);
      res.json(areas);
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ message: "Failed to fetch areas" });
    }
  });
  
  // Get a specific area
  apiRouter.get("/areas/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid area ID" });
      }

      const area = await storage.getAreaById(id);
      if (!area) {
        return res.status(404).json({ message: "Area not found" });
      }
      
      // Check if the user has access to this area
      const userId = req.session!.userId!;
      if (area.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this area" });
      }

      res.json(area);
    } catch (error) {
      console.error("Error fetching area:", error);
      res.status(500).json({ message: "Failed to fetch area" });
    }
  });
  
  // Get photos for a specific area
  apiRouter.get("/areas/:id/photos", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid area ID" });
      }

      const area = await storage.getAreaById(id);
      if (!area) {
        return res.status(404).json({ message: "Area not found" });
      }
      
      // Check if the user has access to this area
      const userId = req.session!.userId!;
      if (area.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this area" });
      }

      const photos = await storage.getPhotosByAreaId(id);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching area photos:", error);
      res.status(500).json({ message: "Failed to fetch area photos" });
    }
  });
  
  // Create a new area
  apiRouter.post("/areas", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const areaData = insertAreaSchema.parse({
        ...req.body,
        userId
      });
      
      const newArea = await storage.createArea(areaData);
      res.status(201).json(newArea);
    } catch (error) {
      console.error("Error creating area:", error);
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      res.status(500).json({ message: "Failed to create area" });
    }
  });
  
  // Update an area (rename)
  apiRouter.patch("/areas/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid area ID" });
      }

      const userId = req.session!.userId!;
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }

      const updatedArea = await storage.updateArea(id, name, userId);
      if (!updatedArea) {
        return res.status(404).json({ message: "Area not found or you don't have permission to update it" });
      }

      res.json(updatedArea);
    } catch (error) {
      console.error("Error updating area:", error);
      res.status(500).json({ message: "Failed to update area" });
    }
  });
  
  // Delete an area and all its photos
  apiRouter.delete("/areas/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid area ID" });
      }

      const userId = req.session!.userId!;
      
      const deleted = await storage.deleteArea(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Area not found or you don't have permission to delete it" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting area:", error);
      res.status(500).json({ message: "Failed to delete area" });
    }
  });

  // PHOTO ROUTES
  
  // Get all photos for the current user
  apiRouter.get("/photos", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const photos = await storage.getAllPhotos(userId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  // Get a specific photo with its tags
  apiRouter.get("/photos/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const userId = req.session!.userId!;
      const photo = await storage.getPhotoWithTags(id);
      
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      // Check if the user has access to this photo
      if (photo.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this photo" });
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

  // Upload a new photo
  apiRouter.post("/photos", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const userId = req.session!.userId!;
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      const { areaId, name } = req.body;
      
      if (!areaId || !name) {
        return res.status(400).json({ message: "Area ID and name are required" });
      }
      
      // Check if area exists and belongs to the user
      const area = await storage.getAreaById(parseInt(areaId, 10));
      if (!area || area.userId !== userId) {
        return res.status(404).json({ message: "Area not found or doesn't belong to you" });
      }
      
      // Generate a unique filename
      const fileExt = req.file.mimetype.split('/')[1];
      const filename = `${uuidv4()}.${fileExt}`;
      
      // Convert buffer to base64
      const imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      const photoData = {
        userId,
        areaId: parseInt(areaId, 10),
        name,
        filename,
        imageData
      };
      
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
  
  // Move photo to different area
  apiRouter.patch("/photos/:id/move", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const userId = req.session!.userId!;
      const { areaId } = req.body;
      
      if (!areaId || typeof areaId !== 'number') {
        return res.status(400).json({ message: "Area ID is required" });
      }
      
      // Check if area exists and belongs to the user
      const area = await storage.getAreaById(areaId);
      if (!area || area.userId !== userId) {
        return res.status(404).json({ message: "Area not found or doesn't belong to you" });
      }

      const updatedPhoto = await storage.movePhoto(id, areaId, userId);
      if (!updatedPhoto) {
        return res.status(404).json({ message: "Photo not found or you don't have permission to move it" });
      }

      res.json(updatedPhoto);
    } catch (error) {
      console.error("Error moving photo:", error);
      res.status(500).json({ message: "Failed to move photo" });
    }
  });

  // Delete a photo
  apiRouter.delete("/photos/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

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

  // TAG ROUTES
  
  // Get all tags for a photo
  apiRouter.get("/photos/:photoId/tags", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const tags = await storage.getTagsByPhotoId(photoId);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // Create a new tag
  apiRouter.post("/photos/:photoId/tags", requireAuth, upload.single('tagImage'), async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const userId = req.session!.userId!;

      // Check if photo exists and belongs to the user
      const photo = await storage.getPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      if (photo.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to add tags to this photo" });
      }
      
      const { description, details, notes, positionX, positionY } = req.body;
      
      // Process tag image if provided
      let tagImage = null;
      if (req.file) {
        tagImage = req.file.buffer.toString('base64');
      }
      
      const tagData = {
        photoId,
        userId,
        description,
        details: details || null,
        notes: notes || null,
        tagImage,
        positionX: parseFloat(positionX),
        positionY: parseFloat(positionY)
      };

      const newTag = await storage.createTag(tagData);
      res.status(201).json(newTag);
    } catch (error) {
      console.error("Error creating tag:", error);
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  // Update a tag
  apiRouter.patch("/photos/:photoId/tags/:id", requireAuth, upload.single('tagImage'), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tag ID" });
      }

      const userId = req.session!.userId!;
      const { description, details, notes } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }
      
      // Get the current tag
      const currentTag = await storage.getTag(id);
      if (!currentTag || currentTag.userId !== userId) {
        return res.status(404).json({ message: "Tag not found or you don't have permission to update it" });
      }
      
      // Process tag image if provided
      let tagImage = currentTag.tagImage;
      if (req.file) {
        tagImage = req.file.buffer.toString('base64');
      }
      
      // Update tag with new values
      const updatedTag = await storage.updateTag(
        id, 
        description, 
        details || '', 
        notes || '', 
        userId
      );
      
      if (!updatedTag) {
        return res.status(404).json({ message: "Tag not found or you don't have permission to update it" });
      }

      res.json(updatedTag);
    } catch (error) {
      console.error("Error updating tag:", error);
      res.status(500).json({ message: "Failed to update tag" });
    }
  });

  // Delete a tag
  apiRouter.delete("/photos/:photoId/tags/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tag ID" });
      }

      const userId = req.session!.userId!;
      
      const deleted = await storage.deleteTag(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Tag not found or you don't have permission to delete it" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tag:", error);
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // Delete all tags for a photo
  apiRouter.delete("/photos/:photoId/tags", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const userId = req.session!.userId!;
      
      // Check if the user owns the photo
      const photo = await storage.getPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      if (photo.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete tags for this photo" });
      }

      await storage.deleteAllTagsForPhoto(photoId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tags:", error);
      res.status(500).json({ message: "Failed to delete tags" });
    }
  });

  app.use('/api', apiRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}