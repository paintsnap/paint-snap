import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { insertPhotoSchema, insertAnnotationSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from 'zod-validation-error';

// Helper for validation errors
function handleZodError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    const validationError = fromZodError(error);
    return res.status(400).json({ message: validationError.message });
  }
  return res.status(500).json({ message: "Internal server error" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  const apiRouter = express.Router();

  // PHOTO ROUTES
  
  // Get all photos for the gallery
  apiRouter.get("/photos", async (_req, res) => {
    try {
      const photos = await storage.getAllPhotos();
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
  apiRouter.post("/photos", async (req, res) => {
    try {
      const photoData = insertPhotoSchema.parse(req.body);
      const newPhoto = await storage.createPhoto(photoData);
      res.status(201).json(newPhoto);
    } catch (error) {
      console.error("Error creating photo:", error);
      return handleZodError(error, res);
    }
  });

  // Update a photo's name
  apiRouter.patch("/photos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }

      const updatedPhoto = await storage.updatePhoto(id, name);
      if (!updatedPhoto) {
        return res.status(404).json({ message: "Photo not found" });
      }

      res.json(updatedPhoto);
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ message: "Failed to update photo" });
    }
  });

  // Delete a photo
  apiRouter.delete("/photos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      const deleted = await storage.deletePhoto(id);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found" });
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
  apiRouter.post("/photos/:photoId/annotations", async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }

      // Check if photo exists
      const photo = await storage.getPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const annotationData = insertAnnotationSchema.parse({
        ...req.body,
        photoId
      });

      const newAnnotation = await storage.createAnnotation(annotationData);
      res.status(201).json(newAnnotation);
    } catch (error) {
      console.error("Error creating annotation:", error);
      return handleZodError(error, res);
    }
  });

  // Update an annotation
  apiRouter.patch("/annotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }

      const { title, content } = req.body;
      if (!title || !content || typeof title !== 'string' || typeof content !== 'string') {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const updatedAnnotation = await storage.updateAnnotation(id, title, content);
      if (!updatedAnnotation) {
        return res.status(404).json({ message: "Annotation not found" });
      }

      res.json(updatedAnnotation);
    } catch (error) {
      console.error("Error updating annotation:", error);
      res.status(500).json({ message: "Failed to update annotation" });
    }
  });

  // Delete an annotation
  apiRouter.delete("/annotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }

      const deleted = await storage.deleteAnnotation(id);
      if (!deleted) {
        return res.status(404).json({ message: "Annotation not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting annotation:", error);
      res.status(500).json({ message: "Failed to delete annotation" });
    }
  });

  // Delete all annotations for a photo
  apiRouter.delete("/photos/:photoId/annotations", async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
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
