import { 
  photos, annotations, 
  type Photo, type Annotation, 
  type InsertPhoto, type InsertAnnotation,
  type PhotoWithAnnotations, type PhotoWithAnnotationsDetailed
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Photo methods
  getAllPhotos(): Promise<PhotoWithAnnotations[]>;
  getPhotoById(id: number): Promise<Photo | undefined>;
  getPhotoWithAnnotations(id: number): Promise<PhotoWithAnnotationsDetailed | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: number, name: string): Promise<Photo | undefined>;
  deletePhoto(id: number): Promise<boolean>;

  // Annotation methods
  getAnnotationsByPhotoId(photoId: number): Promise<Annotation[]>;
  getAnnotation(id: number): Promise<Annotation | undefined>;
  createAnnotation(annotation: InsertAnnotation): Promise<Annotation>;
  updateAnnotation(id: number, title: string, content: string): Promise<Annotation | undefined>;
  deleteAnnotation(id: number): Promise<boolean>;
  deleteAllAnnotationsForPhoto(photoId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private photos: Map<number, Photo>;
  private annotations: Map<number, Annotation>;
  private photoIdCounter: number;
  private annotationIdCounter: number;

  constructor() {
    this.photos = new Map();
    this.annotations = new Map();
    this.photoIdCounter = 1;
    this.annotationIdCounter = 1;
  }

  // Photo methods
  async getAllPhotos(): Promise<PhotoWithAnnotations[]> {
    const photosArray = Array.from(this.photos.values());
    return photosArray.map(photo => {
      const photoAnnotations = Array.from(this.annotations.values())
        .filter(a => a.photoId === photo.id);
      
      return {
        id: photo.id,
        name: photo.name,
        filename: photo.filename,
        uploadDate: photo.uploadDate,
        lastModified: photo.lastModified,
        imageUrl: `/api/photos/${photo.id}/image`,
        annotationCount: photoAnnotations.length
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

    return {
      id: photo.id,
      name: photo.name,
      filename: photo.filename,
      uploadDate: photo.uploadDate,
      lastModified: photo.lastModified,
      imageUrl: `/api/photos/${photo.id}/image`,
      annotationCount: photoAnnotations.length,
      annotations: photoAnnotations
    };
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const id = this.photoIdCounter++;
    const now = new Date();
    const photo: Photo = {
      id,
      ...insertPhoto,
      uploadDate: now,
      lastModified: now
    };
    this.photos.set(id, photo);
    return photo;
  }

  async updatePhoto(id: number, name: string): Promise<Photo | undefined> {
    const photo = this.photos.get(id);
    if (!photo) return undefined;

    const updatedPhoto = {
      ...photo,
      name,
      lastModified: new Date()
    };
    this.photos.set(id, updatedPhoto);
    return updatedPhoto;
  }

  async deletePhoto(id: number): Promise<boolean> {
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

  async updateAnnotation(id: number, title: string, content: string): Promise<Annotation | undefined> {
    const annotation = this.annotations.get(id);
    if (!annotation) return undefined;

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

  async deleteAnnotation(id: number): Promise<boolean> {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;
    
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

export const storage = new MemStorage();
