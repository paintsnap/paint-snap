import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Main photos table
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  lastModified: timestamp("last_modified").defaultNow().notNull(),
  imageData: text("image_data").notNull(), // Base64 encoded image data
});

// Table for markers/annotations
export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").notNull().references(() => photos.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  positionX: integer("position_x").notNull(), // X position as percentage (0-100)
  positionY: integer("position_y").notNull(), // Y position as percentage (0-100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  uploadDate: true,
  lastModified: true
});

export const insertAnnotationSchema = createInsertSchema(annotations).omit({
  id: true,
  createdAt: true
});

// Response types that include related data
export interface PhotoWithAnnotations extends Omit<typeof photos.$inferSelect, 'imageData'> {
  imageUrl: string;
  annotationCount: number;
}

export interface PhotoWithAnnotationsDetailed extends PhotoWithAnnotations {
  annotations: (typeof annotations.$inferSelect)[];
}

// Type definitions
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;
export type Photo = typeof photos.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;
