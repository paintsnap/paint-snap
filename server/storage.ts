import { 
  photos, annotations, users,
  type Photo, type Annotation, type User,
  type InsertPhoto, type InsertAnnotation, type InsertUser,
  type PhotoWithAnnotations, type PhotoWithAnnotationsDetailed, type UserProfile
} from "@shared/schema";
import { db } from "./db";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  
  // Photo methods
  getAllPhotos(userId?: number): Promise<PhotoWithAnnotations[]>;
  getPhotoById(id: number): Promise<Photo | undefined>;
  getPhotoWithAnnotations(id: number): Promise<PhotoWithAnnotationsDetailed | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: number, name: string, userId: number): Promise<Photo | undefined>;
  deletePhoto(id: number, userId: number): Promise<boolean>;

  // Annotation methods
  getAnnotationsByPhotoId(photoId: number): Promise<Annotation[]>;
  getAnnotation(id: number): Promise<Annotation | undefined>;
  createAnnotation(annotation: InsertAnnotation): Promise<Annotation>;
  updateAnnotation(id: number, title: string, content: string, userId: number): Promise<Annotation | undefined>;
  deleteAnnotation(id: number, userId: number): Promise<boolean>;
  deleteAllAnnotationsForPhoto(photoId: number): Promise<boolean>;
}

// For MemStorage compatibility with updated interfaces
export class MemStorage implements IStorage {
  private photos: Map<number, Photo>;
  private annotations: Map<number, Annotation>;
  private users: Map<number, User>;
  private photoIdCounter: number;
  private annotationIdCounter: number;
  private userIdCounter: number;

  constructor() {
    this.photos = new Map();
    this.annotations = new Map();
    this.users = new Map();
    this.photoIdCounter = 1;
    this.annotationIdCounter = 1;
    this.userIdCounter = 1;
  }

  // User methods
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.firebaseUid === firebaseUid);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const newUser: User = {
      id,
      firebaseUid: user.firebaseUid,
      displayName: user.displayName || null,
      email: user.email || null,
      photoUrl: user.photoUrl || null,
      createdAt: now,
      lastLogin: now
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      displayName: user.displayName,
      email: user.email,
      photoUrl: user.photoUrl
    };
  }

  // Photo methods
  async getAllPhotos(userId?: number): Promise<PhotoWithAnnotations[]> {
    let photosArray = Array.from(this.photos.values());
    
    // Filter by userId if provided
    if (userId) {
      photosArray = photosArray.filter(p => p.userId === userId);
    }
    
    return photosArray.map(photo => {
      const photoAnnotations = Array.from(this.annotations.values())
        .filter(a => a.photoId === photo.id);
      
      const user = this.users.get(photo.userId);
      
      return {
        id: photo.id,
        userId: photo.userId,
        name: photo.name,
        filename: photo.filename,
        uploadDate: photo.uploadDate,
        lastModified: photo.lastModified,
        imageUrl: `/api/photos/${photo.id}/image`,
        annotationCount: photoAnnotations.length,
        userDisplayName: user?.displayName || undefined,
        isPublic: photo.isPublic
      };
    });
  }

  async getPhotoById(id: number): Promise<Photo | undefined> {
    return this.photos.get(id);
  }

  async getPhotoWithAnnotations(id: number): Promise<PhotoWithAnnotationsDetailed | undefined> {
    const photo = this.photos.get(id);
    if (!photo) return undefined;

    const photoAnnotations = Array.from(this.annotations.values())
      .filter(a => a.photoId === id);
      
    const user = this.users.get(photo.userId);

    return {
      id: photo.id,
      userId: photo.userId,
      name: photo.name,
      filename: photo.filename,
      uploadDate: photo.uploadDate,
      lastModified: photo.lastModified,
      imageUrl: `/api/photos/${photo.id}/image`,
      annotationCount: photoAnnotations.length,
      annotations: photoAnnotations,
      userDisplayName: user?.displayName || undefined,
      isPublic: photo.isPublic
    };
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const id = this.photoIdCounter++;
    const now = new Date();
    const photo: Photo = {
      id,
      name: insertPhoto.name,
      userId: insertPhoto.userId,
      filename: insertPhoto.filename,
      imageData: insertPhoto.imageData,
      isPublic: insertPhoto.isPublic ?? false,
      uploadDate: now,
      lastModified: now
    };
    this.photos.set(id, photo);
    return photo;
  }

  async updatePhoto(id: number, name: string, userId: number): Promise<Photo | undefined> {
    const photo = this.photos.get(id);
    if (!photo) return undefined;
    
    // Check authorization
    if (photo.userId !== userId) return undefined;

    const updatedPhoto = {
      ...photo,
      name,
      lastModified: new Date()
    };
    this.photos.set(id, updatedPhoto);
    return updatedPhoto;
  }

  async deletePhoto(id: number, userId: number): Promise<boolean> {
    const photo = this.photos.get(id);
    if (!photo) return false;
    
    // Check authorization
    if (photo.userId !== userId) return false;
    
    const deleted = this.photos.delete(id);
    if (deleted) {
      // Delete all annotations for this photo
      await this.deleteAllAnnotationsForPhoto(id);
    }
    return deleted;
  }

  // Annotation methods
  async getAnnotationsByPhotoId(photoId: number): Promise<Annotation[]> {
    return Array.from(this.annotations.values())
      .filter(a => a.photoId === photoId);
  }

  async getAnnotation(id: number): Promise<Annotation | undefined> {
    return this.annotations.get(id);
  }

  async createAnnotation(insertAnnotation: InsertAnnotation): Promise<Annotation> {
    const id = this.annotationIdCounter++;
    const annotation: Annotation = {
      id,
      ...insertAnnotation,
      createdAt: new Date()
    };
    this.annotations.set(id, annotation);
    
    // Update the photo's last modified timestamp
    const photo = this.photos.get(annotation.photoId);
    if (photo) {
      this.photos.set(annotation.photoId, {
        ...photo,
        lastModified: new Date()
      });
    }
    
    return annotation;
  }

  async updateAnnotation(id: number, title: string, content: string, userId: number): Promise<Annotation | undefined> {
    const annotation = this.annotations.get(id);
    if (!annotation) return undefined;
    
    // Check authorization
    if (annotation.userId !== userId) return undefined;

    const updatedAnnotation = {
      ...annotation,
      title,
      content
    };
    this.annotations.set(id, updatedAnnotation);
    
    // Update the photo's last modified timestamp
    const photo = this.photos.get(updatedAnnotation.photoId);
    if (photo) {
      this.photos.set(updatedAnnotation.photoId, {
        ...photo,
        lastModified: new Date()
      });
    }
    
    return updatedAnnotation;
  }

  async deleteAnnotation(id: number, userId: number): Promise<boolean> {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;
    
    // Check authorization
    if (annotation.userId !== userId) return false;
    
    const deleted = this.annotations.delete(id);
    
    // Update the photo's last modified timestamp
    if (deleted) {
      const photo = this.photos.get(annotation.photoId);
      if (photo) {
        this.photos.set(annotation.photoId, {
          ...photo,
          lastModified: new Date()
        });
      }
    }
    
    return deleted;
  }

  async deleteAllAnnotationsForPhoto(photoId: number): Promise<boolean> {
    const annotationsToDelete = Array.from(this.annotations.values())
      .filter(a => a.photoId === photoId);
      
    for (const annotation of annotationsToDelete) {
      this.annotations.delete(annotation.id);
    }
    
    return true;
  }
}

// Import needed dependencies for database operations
import { eq, and, sql, asc, desc } from "drizzle-orm";

// Implement the DatabaseStorage class
export class DatabaseStorage implements IStorage {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const now = new Date();
    const userData = {
      ...user,
      // Ensure these fields are not undefined
      displayName: user.displayName || null,
      email: user.email || null,
      photoUrl: user.photoUrl || null,
      createdAt: now,
      lastLogin: now
    };
    
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  }

  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return undefined;
    
    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      displayName: user.displayName,
      email: user.email,
      photoUrl: user.photoUrl
    };
  }

  // Photo methods
  async getAllPhotos(userId?: number): Promise<PhotoWithAnnotations[]> {
    let query = db.select({
      id: photos.id,
      userId: photos.userId,
      name: photos.name,
      filename: photos.filename,
      uploadDate: photos.uploadDate,
      lastModified: photos.lastModified,
      isPublic: photos.isPublic,
      displayName: users.displayName,
      annotationCount: sql<number>`COUNT(${annotations.id})::int`
    })
    .from(photos)
    .leftJoin(annotations, eq(photos.id, annotations.photoId))
    .leftJoin(users, eq(photos.userId, users.id))
    .groupBy(photos.id, users.id);
    
    // Filter by userId if provided
    if (userId) {
      query = query.where(
        // Show photos owned by the user or public photos
        sql`${photos.userId} = ${userId} OR ${photos.isPublic} = true`
      );
    } else {
      // Only show public photos for non-authenticated users
      query = query.where(eq(photos.isPublic, true));
    }
    
    const results = await query.orderBy(desc(photos.uploadDate));
    
    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      filename: row.filename,
      uploadDate: row.uploadDate,
      lastModified: row.lastModified,
      imageUrl: `/api/photos/${row.id}/image`,
      annotationCount: row.annotationCount || 0,
      userDisplayName: row.displayName || undefined,
      isPublic: row.isPublic
    }));
  }

  async getPhotoById(id: number): Promise<Photo | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    return photo;
  }

  async getPhotoWithAnnotations(id: number): Promise<PhotoWithAnnotationsDetailed | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    if (!photo) return undefined;
    
    const [user] = await db.select().from(users).where(eq(users.id, photo.userId));
    const photoAnnotations = await db
      .select()
      .from(annotations)
      .where(eq(annotations.photoId, id))
      .orderBy(asc(annotations.id));
    
    return {
      id: photo.id,
      userId: photo.userId,
      name: photo.name,
      filename: photo.filename,
      uploadDate: photo.uploadDate,
      lastModified: photo.lastModified,
      imageUrl: `/api/photos/${photo.id}/image`,
      annotationCount: photoAnnotations.length,
      annotations: photoAnnotations,
      userDisplayName: user?.displayName || undefined,
      isPublic: photo.isPublic
    };
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    // Ensure isPublic is set to prevent type errors
    const photoData = {
      ...photo,
      isPublic: photo.isPublic ?? false
    };
    const [newPhoto] = await db.insert(photos).values(photoData).returning();
    return newPhoto;
  }

  async updatePhoto(id: number, name: string, userId: number): Promise<Photo | undefined> {
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.userId, userId)));
      
    if (!photo) return undefined;
    
    const [updatedPhoto] = await db
      .update(photos)
      .set({ 
        name, 
        lastModified: new Date() 
      })
      .where(eq(photos.id, id))
      .returning();
      
    return updatedPhoto;
  }

  async deletePhoto(id: number, userId: number): Promise<boolean> {
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.userId, userId)));
      
    if (!photo) return false;
    
    // Delete all annotations for this photo first
    await this.deleteAllAnnotationsForPhoto(id);
    
    const result = await db
      .delete(photos)
      .where(eq(photos.id, id));
      
    return result.count > 0;
  }

  // Annotation methods
  async getAnnotationsByPhotoId(photoId: number): Promise<Annotation[]> {
    const annotations = await db
      .select()
      .from(annotations)
      .where(eq(annotations.photoId, photoId))
      .orderBy(asc(annotations.id));
      
    return annotations;
  }

  async getAnnotation(id: number): Promise<Annotation | undefined> {
    const [annotation] = await db
      .select()
      .from(annotations)
      .where(eq(annotations.id, id));
      
    return annotation;
  }

  async createAnnotation(annotation: InsertAnnotation): Promise<Annotation> {
    const [newAnnotation] = await db
      .insert(annotations)
      .values(annotation)
      .returning();
      
    // Update the photo's last modified timestamp
    await db
      .update(photos)
      .set({ lastModified: new Date() })
      .where(eq(photos.id, newAnnotation.photoId));
      
    return newAnnotation;
  }

  async updateAnnotation(id: number, title: string, content: string, userId: number): Promise<Annotation | undefined> {
    const [annotation] = await db
      .select()
      .from(annotations)
      .where(and(eq(annotations.id, id), eq(annotations.userId, userId)));
      
    if (!annotation) return undefined;
    
    const [updatedAnnotation] = await db
      .update(annotations)
      .set({ title, content })
      .where(eq(annotations.id, id))
      .returning();
      
    // Update the photo's last modified timestamp
    await db
      .update(photos)
      .set({ lastModified: new Date() })
      .where(eq(photos.id, updatedAnnotation.photoId));
      
    return updatedAnnotation;
  }

  async deleteAnnotation(id: number, userId: number): Promise<boolean> {
    const [annotation] = await db
      .select()
      .from(annotations)
      .where(and(eq(annotations.id, id), eq(annotations.userId, userId)));
      
    if (!annotation) return false;
    
    const result = await db
      .delete(annotations)
      .where(eq(annotations.id, id));
      
    if (result.count > 0) {
      // Update the photo's last modified timestamp
      await db
        .update(photos)
        .set({ lastModified: new Date() })
        .where(eq(photos.id, annotation.photoId));
      
      return true;
    }
    
    return false;
  }

  async deleteAllAnnotationsForPhoto(photoId: number): Promise<boolean> {
    const result = await db
      .delete(annotations)
      .where(eq(annotations.photoId, photoId));
      
    return true;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
