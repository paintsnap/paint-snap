import { 
  photos, tags, areas, users,
  type Photo, type Tag, type Area, type User,
  type InsertPhoto, type InsertTag, type InsertArea, type InsertUser,
  type PhotoWithTags, type PhotoWithTagsDetailed, type AreaWithPhotos, type UserProfile,
  // For backward compatibility
  type PhotoWithAnnotations, type PhotoWithAnnotationsDetailed, type Annotation, type InsertAnnotation,
  // Account limits
  ACCOUNT_LIMITS
} from "@shared/schema";
import { db } from "./db";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  
  // Area methods
  getAreas(userId: number): Promise<AreaWithPhotos[]>;
  getAreaById(id: number): Promise<Area | undefined>;
  createArea(area: InsertArea): Promise<Area>;
  updateArea(id: number, name: string, userId: number): Promise<Area | undefined>;
  deleteArea(id: number, userId: number): Promise<boolean>;
  
  // Photo methods
  getAllPhotos(userId?: number): Promise<PhotoWithTags[]>;
  getPhotosByAreaId(areaId: number): Promise<PhotoWithTags[]>;
  getPhotoById(id: number): Promise<Photo | undefined>;
  getPhotoWithTags(id: number): Promise<PhotoWithTagsDetailed | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: number, name: string, userId: number): Promise<Photo | undefined>;
  movePhoto(id: number, areaId: number, userId: number): Promise<Photo | undefined>;
  deletePhoto(id: number, userId: number): Promise<boolean>;

  // Tag methods
  getTagsByPhotoId(photoId: number): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: number, description: string, details: string, notes: string, userId: number): Promise<Tag | undefined>;
  deleteTag(id: number, userId: number): Promise<boolean>;
  deleteAllTagsForPhoto(photoId: number): Promise<boolean>;
  
  // For backward compatibility
  getAnnotationsByPhotoId(photoId: number): Promise<Annotation[]>;
  getAnnotation(id: number): Promise<Annotation | undefined>;
  createAnnotation(annotation: InsertAnnotation): Promise<Annotation>;
  updateAnnotation(id: number, title: string, content: string, userId: number): Promise<Annotation | undefined>;
  deleteAnnotation(id: number, userId: number): Promise<boolean>;
  deleteAllAnnotationsForPhoto(photoId: number): Promise<boolean>;
  getPhotoWithAnnotations(id: number): Promise<PhotoWithAnnotationsDetailed | undefined>;
}

// For MemStorage compatibility with updated interfaces
export class MemStorage implements IStorage {
  private photos: Map<number, Photo>;
  private tags: Map<number, Tag>;
  private areas: Map<number, Area>;
  private users: Map<number, User>;
  private photoIdCounter: number;
  private tagIdCounter: number;
  private areaIdCounter: number;
  private userIdCounter: number;

  constructor() {
    this.photos = new Map();
    this.tags = new Map();
    this.areas = new Map();
    this.users = new Map();
    this.photoIdCounter = 1;
    this.tagIdCounter = 1;
    this.areaIdCounter = 1;
    this.userIdCounter = 1;
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.firebaseUid === firebaseUid);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const newUser: User = {
      id,
      firebaseUid: user.firebaseUid,
      username: user.username,
      password: user.password,
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
      username: user.username,
      firebaseUid: user.firebaseUid,
      displayName: user.displayName,
      email: user.email,
      photoUrl: user.photoUrl
    };
  }

  // Area methods
  async getAreas(userId: number): Promise<AreaWithPhotos[]> {
    const userAreas = Array.from(this.areas.values())
      .filter(area => area.userId === userId);
    
    return userAreas.map(area => {
      const areaPhotos = Array.from(this.photos.values())
        .filter(photo => photo.areaId === area.id);
      
      // Get the latest photo for preview
      const latestPhoto = areaPhotos.sort((a, b) => 
        b.uploadDate.getTime() - a.uploadDate.getTime()
      )[0];
      
      return {
        ...area,
        photoCount: areaPhotos.length,
        latestPhotoUrl: latestPhoto ? `/api/photos/${latestPhoto.id}/image` : undefined
      };
    });
  }

  async getAreaById(id: number): Promise<Area | undefined> {
    return this.areas.get(id);
  }

  async createArea(area: InsertArea): Promise<Area> {
    const id = this.areaIdCounter++;
    const now = new Date();
    const newArea: Area = {
      id,
      userId: area.userId,
      name: area.name,
      createdAt: now,
      updatedAt: now
    };
    this.areas.set(id, newArea);
    return newArea;
  }

  async updateArea(id: number, name: string, userId: number): Promise<Area | undefined> {
    const area = this.areas.get(id);
    if (!area) return undefined;
    
    // Check authorization
    if (area.userId !== userId) return undefined;

    const updatedArea = {
      ...area,
      name,
      updatedAt: new Date()
    };
    this.areas.set(id, updatedArea);
    return updatedArea;
  }

  async deleteArea(id: number, userId: number): Promise<boolean> {
    const area = this.areas.get(id);
    if (!area) return false;
    
    // Check authorization
    if (area.userId !== userId) return false;
    
    // Check if the area has photos
    const areaPhotos = Array.from(this.photos.values())
      .filter(photo => photo.areaId === id);
    
    // Delete all photos in the area
    for (const photo of areaPhotos) {
      await this.deletePhoto(photo.id, userId);
    }
    
    const deleted = this.areas.delete(id);
    return deleted;
  }

  // Photo methods
  async getAllPhotos(userId?: number): Promise<PhotoWithTags[]> {
    let photosArray = Array.from(this.photos.values());
    
    // Filter by userId if provided
    if (userId) {
      photosArray = photosArray.filter(p => p.userId === userId);
    }
    
    return photosArray.map(photo => {
      const photoTags = Array.from(this.tags.values())
        .filter(t => t.photoId === photo.id);
      
      const area = this.areas.get(photo.areaId);
      
      return {
        id: photo.id,
        userId: photo.userId,
        areaId: photo.areaId,
        name: photo.name,
        filename: photo.filename,
        uploadDate: photo.uploadDate,
        lastModified: photo.lastModified,
        imageUrl: `/api/photos/${photo.id}/image`,
        tagCount: photoTags.length,
        areaName: area?.name
      };
    });
  }

  async getPhotosByAreaId(areaId: number): Promise<PhotoWithTags[]> {
    const areaPhotos = Array.from(this.photos.values())
      .filter(p => p.areaId === areaId);
    
    return areaPhotos.map(photo => {
      const photoTags = Array.from(this.tags.values())
        .filter(t => t.photoId === photo.id);
      
      const area = this.areas.get(photo.areaId);
      
      return {
        id: photo.id,
        userId: photo.userId,
        areaId: photo.areaId,
        name: photo.name,
        filename: photo.filename,
        uploadDate: photo.uploadDate,
        lastModified: photo.lastModified,
        imageUrl: `/api/photos/${photo.id}/image`,
        tagCount: photoTags.length,
        areaName: area?.name
      };
    });
  }

  async getPhotoById(id: number): Promise<Photo | undefined> {
    return this.photos.get(id);
  }

  async getPhotoWithTags(id: number): Promise<PhotoWithTagsDetailed | undefined> {
    const photo = this.photos.get(id);
    if (!photo) return undefined;

    const photoTags = Array.from(this.tags.values())
      .filter(t => t.photoId === id);
      
    const area = this.areas.get(photo.areaId);

    return {
      id: photo.id,
      userId: photo.userId,
      areaId: photo.areaId,
      name: photo.name,
      filename: photo.filename,
      uploadDate: photo.uploadDate,
      lastModified: photo.lastModified,
      imageUrl: `/api/photos/${photo.id}/image`,
      tagCount: photoTags.length,
      tags: photoTags,
      areaName: area?.name
    };
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const id = this.photoIdCounter++;
    const now = new Date();
    const photo: Photo = {
      id,
      name: insertPhoto.name,
      userId: insertPhoto.userId,
      areaId: insertPhoto.areaId,
      filename: insertPhoto.filename,
      imageData: insertPhoto.imageData,
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

  async movePhoto(id: number, areaId: number, userId: number): Promise<Photo | undefined> {
    const photo = this.photos.get(id);
    if (!photo) return undefined;
    
    // Check authorization
    if (photo.userId !== userId) return undefined;
    
    // Check if area exists and belongs to the user
    const area = this.areas.get(areaId);
    if (!area || area.userId !== userId) return undefined;

    const updatedPhoto = {
      ...photo,
      areaId,
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
      // Delete all tags for this photo
      await this.deleteAllTagsForPhoto(id);
    }
    return deleted;
  }

  // Tag methods
  async getTagsByPhotoId(photoId: number): Promise<Tag[]> {
    return Array.from(this.tags.values())
      .filter(t => t.photoId === photoId);
  }

  async getTag(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = this.tagIdCounter++;
    const now = new Date();
    const tag: Tag = {
      id,
      ...insertTag,
      createdAt: now,
      updatedAt: now
    };
    this.tags.set(id, tag);
    
    // Update the photo's last modified timestamp
    const photo = this.photos.get(tag.photoId);
    if (photo) {
      this.photos.set(tag.photoId, {
        ...photo,
        lastModified: new Date()
      });
    }
    
    return tag;
  }

  async updateTag(id: number, description: string, details: string, notes: string, userId: number): Promise<Tag | undefined> {
    const tag = this.tags.get(id);
    if (!tag) return undefined;
    
    // Check authorization
    if (tag.userId !== userId) return undefined;

    const updatedTag = {
      ...tag,
      description,
      details,
      notes,
      updatedAt: new Date()
    };
    this.tags.set(id, updatedTag);
    
    // Update the photo's last modified timestamp
    const photo = this.photos.get(updatedTag.photoId);
    if (photo) {
      this.photos.set(updatedTag.photoId, {
        ...photo,
        lastModified: new Date()
      });
    }
    
    return updatedTag;
  }

  async deleteTag(id: number, userId: number): Promise<boolean> {
    const tag = this.tags.get(id);
    if (!tag) return false;
    
    // Check authorization
    if (tag.userId !== userId) return false;
    
    const deleted = this.tags.delete(id);
    
    // Update the photo's last modified timestamp
    if (deleted) {
      const photo = this.photos.get(tag.photoId);
      if (photo) {
        this.photos.set(tag.photoId, {
          ...photo,
          lastModified: new Date()
        });
      }
    }
    
    return deleted;
  }

  async deleteAllTagsForPhoto(photoId: number): Promise<boolean> {
    const tagsToDelete = Array.from(this.tags.values())
      .filter(t => t.photoId === photoId);
      
    for (const tag of tagsToDelete) {
      this.tags.delete(tag.id);
    }
    
    return true;
  }
  
  // For backward compatibility - deprecated methods
  getAnnotationsByPhotoId(photoId: number): Promise<Annotation[]> {
    return this.getTagsByPhotoId(photoId);
  }
  
  getAnnotation(id: number): Promise<Annotation | undefined> {
    return this.getTag(id);
  }
  
  createAnnotation(annotation: InsertAnnotation): Promise<Annotation> {
    return this.createTag({
      ...annotation,
      description: annotation.title,
      details: annotation.content,
      notes: '',
    });
  }
  
  updateAnnotation(id: number, title: string, content: string, userId: number): Promise<Annotation | undefined> {
    return this.updateTag(id, title, content, '', userId);
  }
  
  deleteAnnotation(id: number, userId: number): Promise<boolean> {
    return this.deleteTag(id, userId);
  }
  
  deleteAllAnnotationsForPhoto(photoId: number): Promise<boolean> {
    return this.deleteAllTagsForPhoto(photoId);
  }
  
  getPhotoWithAnnotations(id: number): Promise<PhotoWithAnnotationsDetailed | undefined> {
    return this.getPhotoWithTags(id) as Promise<PhotoWithAnnotationsDetailed | undefined>;
  }
}

// Import needed dependencies for database operations
import { eq, and, sql, asc, desc } from "drizzle-orm";

// Implement the DatabaseStorage class
export class DatabaseStorage implements IStorage {
  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!username) return undefined;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    if (!firebaseUid) return undefined;
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user;
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
      username: user.username,
      firebaseUid: user.firebaseUid,
      displayName: user.displayName,
      email: user.email,
      photoUrl: user.photoUrl
    };
  }

  // Area methods
  async getAreas(userId: number): Promise<AreaWithPhotos[]> {
    // First, get all areas for the user
    const userAreas = await db
      .select()
      .from(areas)
      .where(eq(areas.userId, userId))
      .orderBy(asc(areas.name));
    
    // For each area, count the photos and get the latest photo
    const results = await Promise.all(userAreas.map(async (area) => {
      // Count photos in this area
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(photos)
        .where(eq(photos.areaId, area.id));
      
      // Get the latest photo for preview
      const [latestPhoto] = await db
        .select()
        .from(photos)
        .where(eq(photos.areaId, area.id))
        .orderBy(desc(photos.uploadDate))
        .limit(1);
      
      return {
        ...area,
        photoCount: count || 0,
        latestPhotoUrl: latestPhoto ? `/api/photos/${latestPhoto.id}/image` : undefined
      };
    }));
    
    return results;
  }

  async getAreaById(id: number): Promise<Area | undefined> {
    const [area] = await db.select().from(areas).where(eq(areas.id, id));
    return area;
  }

  async createArea(area: InsertArea): Promise<Area> {
    const [newArea] = await db.insert(areas).values(area).returning();
    return newArea;
  }

  async updateArea(id: number, name: string, userId: number): Promise<Area | undefined> {
    const [area] = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, id), eq(areas.userId, userId)));
      
    if (!area) return undefined;
    
    const [updatedArea] = await db
      .update(areas)
      .set({ 
        name, 
        updatedAt: new Date() 
      })
      .where(eq(areas.id, id))
      .returning();
      
    return updatedArea;
  }

  async deleteArea(id: number, userId: number): Promise<boolean> {
    const [area] = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, id), eq(areas.userId, userId)));
      
    if (!area) return false;
    
    // Get all photos in this area
    const areaPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.areaId, id));
    
    // Delete all photos in the area
    for (const photo of areaPhotos) {
      await this.deletePhoto(photo.id, userId);
    }
    
    const result = await db
      .delete(areas)
      .where(eq(areas.id, id));
      
    return result.count > 0;
  }

  // Photo methods
  async getAllPhotos(userId?: number): Promise<PhotoWithTags[]> {
    // Query to get photos and tag counts
    let query = db.select({
      id: photos.id,
      userId: photos.userId,
      areaId: photos.areaId,
      name: photos.name,
      filename: photos.filename,
      uploadDate: photos.uploadDate,
      lastModified: photos.lastModified,
      areaName: areas.name,
      tagCount: sql<number>`COUNT(${tags.id})::int`
    })
    .from(photos)
    .leftJoin(tags, eq(photos.id, tags.photoId))
    .leftJoin(areas, eq(photos.areaId, areas.id))
    .groupBy(photos.id, areas.id);
    
    // Filter by userId if provided
    if (userId) {
      query = query.where(eq(photos.userId, userId));
    }
    
    const results = await query.orderBy(desc(photos.uploadDate));
    
    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      areaId: row.areaId,
      name: row.name,
      filename: row.filename,
      uploadDate: row.uploadDate,
      lastModified: row.lastModified,
      imageUrl: `/api/photos/${row.id}/image`,
      tagCount: row.tagCount || 0,
      areaName: row.areaName
    }));
  }

  async getPhotosByAreaId(areaId: number): Promise<PhotoWithTags[]> {
    const results = await db.select({
      id: photos.id,
      userId: photos.userId,
      areaId: photos.areaId,
      name: photos.name,
      filename: photos.filename,
      uploadDate: photos.uploadDate,
      lastModified: photos.lastModified,
      areaName: areas.name,
      tagCount: sql<number>`COUNT(${tags.id})::int`
    })
    .from(photos)
    .leftJoin(tags, eq(photos.id, tags.photoId))
    .leftJoin(areas, eq(photos.areaId, areas.id))
    .where(eq(photos.areaId, areaId))
    .groupBy(photos.id, areas.id)
    .orderBy(desc(photos.uploadDate));
    
    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      areaId: row.areaId,
      name: row.name,
      filename: row.filename,
      uploadDate: row.uploadDate,
      lastModified: row.lastModified,
      imageUrl: `/api/photos/${row.id}/image`,
      tagCount: row.tagCount || 0,
      areaName: row.areaName
    }));
  }

  async getPhotoById(id: number): Promise<Photo | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    return photo;
  }

  async getPhotoWithTags(id: number): Promise<PhotoWithTagsDetailed | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    if (!photo) return undefined;
    
    const [area] = await db.select().from(areas).where(eq(areas.id, photo.areaId));
    const photoTags = await db
      .select()
      .from(tags)
      .where(eq(tags.photoId, id))
      .orderBy(asc(tags.id));
    
    return {
      id: photo.id,
      userId: photo.userId,
      areaId: photo.areaId,
      name: photo.name,
      filename: photo.filename,
      uploadDate: photo.uploadDate,
      lastModified: photo.lastModified,
      imageUrl: `/api/photos/${photo.id}/image`,
      tagCount: photoTags.length,
      tags: photoTags,
      areaName: area?.name
    };
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const [newPhoto] = await db.insert(photos).values(photo).returning();
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

  async movePhoto(id: number, areaId: number, userId: number): Promise<Photo | undefined> {
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.userId, userId)));
      
    if (!photo) return undefined;
    
    // Check if area exists and belongs to the user
    const [area] = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, areaId), eq(areas.userId, userId)));
      
    if (!area) return undefined;
    
    const [updatedPhoto] = await db
      .update(photos)
      .set({ 
        areaId, 
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
    
    // Delete all tags for this photo first
    await this.deleteAllTagsForPhoto(id);
    
    const result = await db
      .delete(photos)
      .where(eq(photos.id, id));
      
    return result.count > 0;
  }

  // Tag methods
  async getTagsByPhotoId(photoId: number): Promise<Tag[]> {
    const photoTags = await db
      .select()
      .from(tags)
      .where(eq(tags.photoId, photoId))
      .orderBy(asc(tags.id));
      
    return photoTags;
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id));
      
    return tag;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db
      .insert(tags)
      .values(tag)
      .returning();
      
    // Update the photo's last modified timestamp
    await db
      .update(photos)
      .set({ lastModified: new Date() })
      .where(eq(photos.id, newTag.photoId));
      
    return newTag;
  }

  async updateTag(id: number, description: string, details: string, notes: string, userId: number): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)));
      
    if (!tag) return undefined;
    
    const [updatedTag] = await db
      .update(tags)
      .set({ 
        description,
        details,
        notes,
        updatedAt: new Date()
      })
      .where(eq(tags.id, id))
      .returning();
      
    // Update the photo's last modified timestamp
    await db
      .update(photos)
      .set({ lastModified: new Date() })
      .where(eq(photos.id, updatedTag.photoId));
      
    return updatedTag;
  }

  async deleteTag(id: number, userId: number): Promise<boolean> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)));
      
    if (!tag) return false;
    
    // Update the photo's last modified timestamp before deleting the tag
    await db
      .update(photos)
      .set({ lastModified: new Date() })
      .where(eq(photos.id, tag.photoId));
    
    const result = await db
      .delete(tags)
      .where(eq(tags.id, id));
      
    return result.count > 0;
  }

  async deleteAllTagsForPhoto(photoId: number): Promise<boolean> {
    const result = await db
      .delete(tags)
      .where(eq(tags.photoId, photoId));
      
    return true;
  }
  
  // For backward compatibility - deprecated methods
  async getAnnotationsByPhotoId(photoId: number): Promise<Annotation[]> {
    return this.getTagsByPhotoId(photoId);
  }
  
  async getAnnotation(id: number): Promise<Annotation | undefined> {
    return this.getTag(id);
  }
  
  async createAnnotation(annotation: InsertAnnotation): Promise<Annotation> {
    return this.createTag({
      photoId: annotation.photoId,
      userId: annotation.userId,
      positionX: annotation.positionX,
      positionY: annotation.positionY,
      description: annotation.title,
      details: annotation.content,
      notes: '',
    });
  }
  
  async updateAnnotation(id: number, title: string, content: string, userId: number): Promise<Annotation | undefined> {
    return this.updateTag(id, title, content, '', userId);
  }
  
  async deleteAnnotation(id: number, userId: number): Promise<boolean> {
    return this.deleteTag(id, userId);
  }
  
  async deleteAllAnnotationsForPhoto(photoId: number): Promise<boolean> {
    return this.deleteAllTagsForPhoto(photoId);
  }
  
  async getPhotoWithAnnotations(id: number): Promise<PhotoWithAnnotationsDetailed | undefined> {
    return this.getPhotoWithTags(id) as Promise<PhotoWithAnnotationsDetailed | undefined>;
  }
}

// Export storage instance - using database implementation
export const storage = new DatabaseStorage();