import { pgTable, text, serial, integer, jsonb, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Allow both Firebase and local authentication
  firebaseUid: text("firebase_uid").unique(),
  username: text("username").unique(),
  password: text("password"), // Hashed password for local authentication
  displayName: text("display_name"),
  email: text("email").unique(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login").defaultNow().notNull(),
});

// Main photos table
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  lastModified: timestamp("last_modified").defaultNow().notNull(),
  imageData: text("image_data").notNull(), // Base64 encoded image data
  isPublic: boolean("is_public").default(false).notNull(),
});

// Table for markers/annotations
export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").notNull().references(() => photos.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  positionX: integer("position_x").notNull(), // X position as percentage (0-100)
  positionY: integer("position_y").notNull(), // Y position as percentage (0-100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

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
  userDisplayName?: string;
}

export interface PhotoWithAnnotationsDetailed extends PhotoWithAnnotations {
  annotations: (typeof annotations.$inferSelect)[];
}

export interface UserProfile {
  id: number;
  username?: string;
  firebaseUid?: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
}

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;
export type User = typeof users.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;
