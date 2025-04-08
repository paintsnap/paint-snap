import { pgTable, text, serial, integer, jsonb, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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

// Areas table (e.g., "Living Room", "Front of House")
export const areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Photos table
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  areaId: integer("area_id").references(() => areas.id).notNull(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  lastModified: timestamp("last_modified").defaultNow().notNull(),
  imageData: text("image_data").notNull(), // Base64 encoded image data
});

// Table for tags (renamed from annotations)
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").notNull().references(() => photos.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  description: text("description").notNull(), // Short label
  details: text("details"), // Paint name/type
  notes: text("notes"), // When it was last painted
  tagImage: text("tag_image"), // Optional image of the paint tin (Base64 encoded)
  positionX: integer("position_x").notNull(), // X position as percentage (0-100)
  positionY: integer("position_y").notNull(), // Y position as percentage (0-100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  areas: many(areas),
  photos: many(photos),
  tags: many(tags),
}));

export const areasRelations = relations(areas, ({ one, many }) => ({
  user: one(users, {
    fields: [areas.userId],
    references: [users.id],
  }),
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  user: one(users, {
    fields: [photos.userId],
    references: [users.id],
  }),
  area: one(areas, {
    fields: [photos.areaId],
    references: [areas.id],
  }),
  tags: many(tags),
}));

export const tagsRelations = relations(tags, ({ one }) => ({
  photo: one(photos, {
    fields: [tags.photoId],
    references: [photos.id],
  }),
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertAreaSchema = createInsertSchema(areas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  uploadDate: true,
  lastModified: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Response types that include related data
export interface PhotoWithTags {
  id: number;
  userId: number;
  areaId: number;
  name: string;
  filename: string;
  uploadDate: Date;
  lastModified: Date;
  imageUrl: string;
  tagCount: number;
  areaName?: string;
}

export interface PhotoWithTagsDetailed extends PhotoWithTags {
  tags: Tag[];
}

export interface AreaWithPhotos {
  id: number;
  userId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  photoCount: number;
  latestPhotoUrl?: string;
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
export type InsertArea = z.infer<typeof insertAreaSchema>;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type User = typeof users.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Tag = typeof tags.$inferSelect;

// For backward compatibility with existing code
export type Annotation = Tag;
export type InsertAnnotation = InsertTag;
export interface PhotoWithAnnotations extends PhotoWithTags {}
export interface PhotoWithAnnotationsDetailed extends PhotoWithTagsDetailed {}