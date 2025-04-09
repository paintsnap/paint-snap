var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express4 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  areas: () => areas,
  areasRelations: () => areasRelations,
  insertAreaSchema: () => insertAreaSchema,
  insertPhotoSchema: () => insertPhotoSchema,
  insertTagSchema: () => insertTagSchema,
  insertUserSchema: () => insertUserSchema,
  photos: () => photos,
  photosRelations: () => photosRelations,
  tags: () => tags,
  tagsRelations: () => tagsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Allow both Firebase and local authentication
  firebaseUid: text("firebase_uid").unique(),
  username: text("username").unique(),
  password: text("password"),
  // Hashed password for local authentication
  displayName: text("display_name"),
  email: text("email").unique(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login").defaultNow().notNull()
});
var areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  areaId: integer("area_id").references(() => areas.id).notNull(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  lastModified: timestamp("last_modified").defaultNow().notNull(),
  imageData: text("image_data").notNull()
  // Base64 encoded image data
});
var tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").notNull().references(() => photos.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  description: text("description").notNull(),
  // Short label
  details: text("details"),
  // Paint name/type
  notes: text("notes"),
  // When it was last painted
  tagImage: text("tag_image"),
  // Optional image of the paint tin (Base64 encoded)
  positionX: integer("position_x").notNull(),
  // X position as percentage (0-100)
  positionY: integer("position_y").notNull(),
  // Y position as percentage (0-100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var usersRelations = relations(users, ({ many }) => ({
  areas: many(areas),
  photos: many(photos),
  tags: many(tags)
}));
var areasRelations = relations(areas, ({ one, many }) => ({
  user: one(users, {
    fields: [areas.userId],
    references: [users.id]
  }),
  photos: many(photos)
}));
var photosRelations = relations(photos, ({ one, many }) => ({
  user: one(users, {
    fields: [photos.userId],
    references: [users.id]
  }),
  area: one(areas, {
    fields: [photos.areaId],
    references: [areas.id]
  }),
  tags: many(tags)
}));
var tagsRelations = relations(tags, ({ one }) => ({
  photo: one(photos, {
    fields: [tags.photoId],
    references: [photos.id]
  }),
  user: one(users, {
    fields: [tags.userId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true
});
var insertAreaSchema = createInsertSchema(areas).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  uploadDate: true,
  lastModified: true
});
var insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
var { Pool } = pkg;
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, sql, asc, desc } from "drizzle-orm";
var DatabaseStorage = class {
  // User methods
  async getUserById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    if (!username) return void 0;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    if (!email) return void 0;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUserByFirebaseUid(firebaseUid) {
    if (!firebaseUid) return void 0;
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user;
  }
  async createUser(user) {
    const now = /* @__PURE__ */ new Date();
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
  async getUserProfile(userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return void 0;
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
  async getAreas(userId) {
    const userAreas = await db.select().from(areas).where(eq(areas.userId, userId)).orderBy(asc(areas.name));
    const results = await Promise.all(userAreas.map(async (area) => {
      const [{ count }] = await db.select({ count: sql`COUNT(*)::int` }).from(photos).where(eq(photos.areaId, area.id));
      const [latestPhoto] = await db.select().from(photos).where(eq(photos.areaId, area.id)).orderBy(desc(photos.uploadDate)).limit(1);
      return {
        ...area,
        photoCount: count || 0,
        latestPhotoUrl: latestPhoto ? `/api/photos/${latestPhoto.id}/image` : void 0
      };
    }));
    return results;
  }
  async getAreaById(id) {
    const [area] = await db.select().from(areas).where(eq(areas.id, id));
    return area;
  }
  async createArea(area) {
    const [newArea] = await db.insert(areas).values(area).returning();
    return newArea;
  }
  async updateArea(id, name, userId) {
    const [area] = await db.select().from(areas).where(and(eq(areas.id, id), eq(areas.userId, userId)));
    if (!area) return void 0;
    const [updatedArea] = await db.update(areas).set({
      name,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(areas.id, id)).returning();
    return updatedArea;
  }
  async deleteArea(id, userId) {
    const [area] = await db.select().from(areas).where(and(eq(areas.id, id), eq(areas.userId, userId)));
    if (!area) return false;
    const areaPhotos = await db.select().from(photos).where(eq(photos.areaId, id));
    for (const photo of areaPhotos) {
      await this.deletePhoto(photo.id, userId);
    }
    const result = await db.delete(areas).where(eq(areas.id, id));
    return result.count > 0;
  }
  // Photo methods
  async getAllPhotos(userId) {
    let query = db.select({
      id: photos.id,
      userId: photos.userId,
      areaId: photos.areaId,
      name: photos.name,
      filename: photos.filename,
      uploadDate: photos.uploadDate,
      lastModified: photos.lastModified,
      areaName: areas.name,
      tagCount: sql`COUNT(${tags.id})::int`
    }).from(photos).leftJoin(tags, eq(photos.id, tags.photoId)).leftJoin(areas, eq(photos.areaId, areas.id)).groupBy(photos.id, areas.id);
    if (userId) {
      query = query.where(eq(photos.userId, userId));
    }
    const results = await query.orderBy(desc(photos.uploadDate));
    return results.map((row) => ({
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
  async getPhotosByAreaId(areaId) {
    const results = await db.select({
      id: photos.id,
      userId: photos.userId,
      areaId: photos.areaId,
      name: photos.name,
      filename: photos.filename,
      uploadDate: photos.uploadDate,
      lastModified: photos.lastModified,
      areaName: areas.name,
      tagCount: sql`COUNT(${tags.id})::int`
    }).from(photos).leftJoin(tags, eq(photos.id, tags.photoId)).leftJoin(areas, eq(photos.areaId, areas.id)).where(eq(photos.areaId, areaId)).groupBy(photos.id, areas.id).orderBy(desc(photos.uploadDate));
    return results.map((row) => ({
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
  async getPhotoById(id) {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    return photo;
  }
  async getPhotoWithTags(id) {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    if (!photo) return void 0;
    const [area] = await db.select().from(areas).where(eq(areas.id, photo.areaId));
    const photoTags = await db.select().from(tags).where(eq(tags.photoId, id)).orderBy(asc(tags.id));
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
  async createPhoto(photo) {
    const [newPhoto] = await db.insert(photos).values(photo).returning();
    return newPhoto;
  }
  async updatePhoto(id, name, userId) {
    const [photo] = await db.select().from(photos).where(and(eq(photos.id, id), eq(photos.userId, userId)));
    if (!photo) return void 0;
    const [updatedPhoto] = await db.update(photos).set({
      name,
      lastModified: /* @__PURE__ */ new Date()
    }).where(eq(photos.id, id)).returning();
    return updatedPhoto;
  }
  async movePhoto(id, areaId, userId) {
    const [photo] = await db.select().from(photos).where(and(eq(photos.id, id), eq(photos.userId, userId)));
    if (!photo) return void 0;
    const [area] = await db.select().from(areas).where(and(eq(areas.id, areaId), eq(areas.userId, userId)));
    if (!area) return void 0;
    const [updatedPhoto] = await db.update(photos).set({
      areaId,
      lastModified: /* @__PURE__ */ new Date()
    }).where(eq(photos.id, id)).returning();
    return updatedPhoto;
  }
  async deletePhoto(id, userId) {
    const [photo] = await db.select().from(photos).where(and(eq(photos.id, id), eq(photos.userId, userId)));
    if (!photo) return false;
    await this.deleteAllTagsForPhoto(id);
    const result = await db.delete(photos).where(eq(photos.id, id));
    return result.count > 0;
  }
  // Tag methods
  async getTagsByPhotoId(photoId) {
    const photoTags = await db.select().from(tags).where(eq(tags.photoId, photoId)).orderBy(asc(tags.id));
    return photoTags;
  }
  async getTag(id) {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }
  async createTag(tag) {
    const [newTag] = await db.insert(tags).values(tag).returning();
    await db.update(photos).set({ lastModified: /* @__PURE__ */ new Date() }).where(eq(photos.id, newTag.photoId));
    return newTag;
  }
  async updateTag(id, description, details, notes, userId) {
    const [tag] = await db.select().from(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
    if (!tag) return void 0;
    const [updatedTag] = await db.update(tags).set({
      description,
      details,
      notes,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(tags.id, id)).returning();
    await db.update(photos).set({ lastModified: /* @__PURE__ */ new Date() }).where(eq(photos.id, updatedTag.photoId));
    return updatedTag;
  }
  async deleteTag(id, userId) {
    const [tag] = await db.select().from(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
    if (!tag) return false;
    await db.update(photos).set({ lastModified: /* @__PURE__ */ new Date() }).where(eq(photos.id, tag.photoId));
    const result = await db.delete(tags).where(eq(tags.id, id));
    return result.count > 0;
  }
  async deleteAllTagsForPhoto(photoId) {
    const result = await db.delete(tags).where(eq(tags.photoId, photoId));
    return true;
  }
  // For backward compatibility - deprecated methods
  async getAnnotationsByPhotoId(photoId) {
    return this.getTagsByPhotoId(photoId);
  }
  async getAnnotation(id) {
    return this.getTag(id);
  }
  async createAnnotation(annotation) {
    return this.createTag({
      photoId: annotation.photoId,
      userId: annotation.userId,
      positionX: annotation.positionX,
      positionY: annotation.positionY,
      description: annotation.title,
      details: annotation.content,
      notes: ""
    });
  }
  async updateAnnotation(id, title, content, userId) {
    return this.updateTag(id, title, content, "", userId);
  }
  async deleteAnnotation(id, userId) {
    return this.deleteTag(id, userId);
  }
  async deleteAllAnnotationsForPhoto(photoId) {
    return this.deleteAllTagsForPhoto(photoId);
  }
  async getPhotoWithAnnotations(id) {
    return this.getPhotoWithTags(id);
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import express2 from "express";
import session2 from "express-session";
import connectPgSimple from "connect-pg-simple";
import pkg2 from "pg";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { ZodError as ZodError2 } from "zod";

// server/utils.ts
import { fromZodError } from "zod-validation-error";
function handleZodError(error, res) {
  const validationError = fromZodError(error);
  return res.status(400).json({
    error: "Validation error",
    message: validationError.message,
    details: validationError.details
  });
}
var requireAuth = (req, res, next) => {
  if (!req.isAuthenticated() && (!req.session || !req.session.userId)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.isAuthenticated() && !req.session?.userId && req.user) {
    req.session.userId = req.user.id;
  }
  next();
};

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app3, sessionStore) {
  const sessionSettings = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "annotation-app-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      // 30 days
      secure: false,
      // Set to false for development to work over HTTP
      httpOnly: true,
      sameSite: "lax"
      // Helps with CSRF protection
    }
  };
  app3.use(session(sessionSettings));
  app3.use(passport.initialize());
  app3.use(passport.session());
  app3.use((req, res, next) => {
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    next();
  });
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        let user = await storage.getUserByUsername(username);
        if (!user) {
          user = await storage.getUserByEmail(username);
        }
        if (!user) {
          console.log(`No user found for username/email: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        if (user.password) {
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            console.log(`Invalid password for user: ${username}`);
            return done(null, false, { message: "Invalid username or password" });
          }
        } else if (user.firebaseUid && !user.password) {
          console.log(`Firebase user ${username} attempted local login`);
          return done(null, false, { message: "Please use Firebase authentication" });
        }
        return done(null, user);
      } catch (error) {
        console.error("Error in local authentication:", error);
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => {
    const typedUser = user;
    console.log("Serializing user:", typedUser.id);
    done(null, typedUser.id);
  });
  passport.deserializeUser(async (id, done) => {
    console.log("Deserializing user ID:", id);
    try {
      const user = await storage.getUserById(id);
      if (!user) {
        console.log("User not found during deserialization");
        return done(null, false);
      }
      console.log("User deserialized successfully:", user.id);
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });
}

// server/routes/auth.ts
import express from "express";
import { z } from "zod";

// server/firebase-admin.ts
import * as admin from "firebase-admin";
var app = null;
function getFirebaseAdmin() {
  if (!app) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      console.error("Missing Firebase service account credentials:", {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey
      });
      throw new Error("Firebase service account credentials are missing");
    }
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      console.log("Firebase Admin initialized successfully with service account credentials");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin with service account:", error);
      throw error;
    }
  }
  return app;
}

// server/routes/auth.ts
import passport2 from "passport";
import { scrypt as scrypt2, randomBytes as randomBytes2, timingSafeEqual as timingSafeEqual2 } from "crypto";
import { promisify as promisify2 } from "util";
import { ZodError } from "zod";
var router = express.Router();
var scryptAsync2 = promisify2(scrypt2);
async function hashPassword(password) {
  const salt = randomBytes2(16).toString("hex");
  const buf = await scryptAsync2(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
var tokenSchema = z.object({
  token: z.string().min(1)
});
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" });
    }
    const existingByUsername = await storage.getUserByUsername(username);
    if (existingByUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const existingByEmail = await storage.getUserByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username
    });
    req.session.userId = user.id;
    console.log("User ID stored in session after registration:", user.id);
    req.login(user, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({ message: "Registration successful but login failed" });
      }
      return res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof ZodError) {
      return handleZodError(error, res);
    }
    return res.status(500).json({ message: "Failed to register user" });
  }
});
router.post("/login", (req, res, next) => {
  passport2.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Error in passport authentication:", err);
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || "Authentication failed" });
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error("Login error:", loginErr);
        return next(loginErr);
      }
      req.session.userId = user.id;
      console.log("User ID stored in session after login:", user.id);
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username
      });
    });
  })(req, res, next);
});
router.post("/verify-token", async (req, res) => {
  try {
    const { token } = tokenSchema.parse(req.body);
    const auth = getFirebaseAdmin().auth();
    console.log("Firebase auth instance initialized");
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
      console.log("Token verified successfully, uid:", decodedToken.uid);
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({
        message: "Invalid token",
        details: verifyError.message || "Unknown verification error"
      });
    }
    if (!decodedToken || !decodedToken.uid) {
      console.error("Token verification returned invalid data");
      return res.status(401).json({ message: "Invalid token data" });
    }
    const { uid } = decodedToken;
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
      console.log("Firebase user retrieved:", userRecord.uid);
    } catch (userError) {
      console.error("Error fetching user data from Firebase:", userError);
      return res.status(404).json({
        message: "User not found in Firebase",
        details: userError.message || "Unknown Firebase error"
      });
    }
    const { displayName, email, photoURL } = userRecord;
    console.log("User data:", { uid, displayName, email, hasPhoto: !!photoURL });
    let user = await storage.getUserByFirebaseUid(uid);
    if (!user) {
      console.log("Creating new user in database");
      user = await storage.createUser({
        firebaseUid: uid,
        displayName: displayName || null,
        email: email || null,
        photoUrl: photoURL || null
      });
      console.log("New user created with ID:", user.id);
    } else {
      console.log("Existing user found with ID:", user.id);
    }
    req.session.userId = user.id;
    console.log("User ID stored in session:", user.id);
    req.login(user, async (err) => {
      if (err) {
        console.error("Passport login error:", err);
        return res.status(500).json({ message: "Authentication successful but session creation failed" });
      }
      await new Promise((resolve, reject) => {
        req.session.save((err2) => {
          if (err2) {
            console.error("Failed to save session:", err2);
            reject(err2);
          } else {
            console.log("Session saved successfully");
            resolve();
          }
        });
      });
      const userProfile = await storage.getUserProfile(user.id);
      res.json(userProfile);
    });
  } catch (error) {
    console.error("Authentication error:", error);
    if (error instanceof z.ZodError) {
      return handleZodError(error, res);
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      message: "Authentication failed",
      details: errorMessage
    });
  }
});
router.get("/user", (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = req.user;
  console.log("Current authenticated user:", user.id);
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    photoUrl: user.photoUrl
  });
});
router.get("/me", (req, res, next) => {
  if (!req.isAuthenticated() && !req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.redirect("/api/auth/user");
});
router.post("/logout", (req, res) => {
  const userId = req.user ? req.user.id : req.session?.userId;
  console.log("Logging out user:", userId);
  req.logout(function(err) {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Error during logout" });
    }
    req.session?.destroy((sessErr) => {
      if (sessErr) {
        console.error("Error destroying session:", sessErr);
      }
      console.log("User logged out successfully");
      res.json({ message: "Logged out successfully" });
    });
  });
});
var auth_default = router;

// server/routes.ts
var { Pool: Pool2 } = pkg2;
async function registerRoutes(app3) {
  const PgStore = connectPgSimple(session2);
  const sessionPool = new Pool2({
    connectionString: process.env.DATABASE_URL
  });
  const sessionStore = new PgStore({
    pool: sessionPool,
    createTableIfMissing: true
  });
  console.log("SESSION_SECRET exists:", !!process.env.SESSION_SECRET);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  setupAuth(app3, sessionStore);
  const multerStorage = multer.memoryStorage();
  const upload = multer({
    storage: multerStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
    // 10MB limit
  });
  const apiRouter = express2.Router();
  apiRouter.use("/auth", auth_default);
  apiRouter.get("/areas", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      console.log(`Getting areas for user: ${userId}`);
      const areas2 = await storage.getAreas(userId);
      console.log(`Areas returned: ${areas2.length}`);
      console.log("Areas data:", JSON.stringify(areas2, null, 2));
      res.json(areas2);
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ message: "Failed to fetch areas" });
    }
  });
  apiRouter.get("/areas/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      console.log(`Getting specific area with ID: ${id}`);
      if (isNaN(id)) {
        console.log("Invalid area ID parameter");
        return res.status(400).json({ message: "Invalid area ID" });
      }
      const area = await storage.getAreaById(id);
      console.log(`Area found:`, area);
      if (!area) {
        console.log(`Area with ID ${id} not found`);
        return res.status(404).json({ message: "Area not found" });
      }
      const userId = req.session.userId;
      console.log(`User ID from session: ${userId}, Area user ID: ${area.userId}`);
      if (area.userId !== userId) {
        console.log(`User ${userId} doesn't have permission to access area ${id}`);
        return res.status(403).json({ message: "You don't have permission to access this area" });
      }
      console.log("Sending area data to client");
      res.json(area);
    } catch (error) {
      console.error("Error fetching area:", error);
      res.status(500).json({ message: "Failed to fetch area" });
    }
  });
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
      const userId = req.session.userId;
      if (area.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this area" });
      }
      const photos2 = await storage.getPhotosByAreaId(id);
      res.json(photos2);
    } catch (error) {
      console.error("Error fetching area photos:", error);
      res.status(500).json({ message: "Failed to fetch area photos" });
    }
  });
  apiRouter.post("/areas", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const areaData = insertAreaSchema.parse({
        ...req.body,
        userId
      });
      const newArea = await storage.createArea(areaData);
      res.status(201).json(newArea);
    } catch (error) {
      console.error("Error creating area:", error);
      if (error instanceof ZodError2) {
        return handleZodError(error, res);
      }
      res.status(500).json({ message: "Failed to create area" });
    }
  });
  apiRouter.patch("/areas/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid area ID" });
      }
      const userId = req.session.userId;
      const { name } = req.body;
      if (!name || typeof name !== "string") {
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
  apiRouter.delete("/areas/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid area ID" });
      }
      const userId = req.session.userId;
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
  apiRouter.get("/photos", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const photos2 = await storage.getAllPhotos(userId);
      res.json(photos2);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });
  apiRouter.get("/photos/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }
      const userId = req.session.userId;
      const photo = await storage.getPhotoWithTags(id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      if (photo.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this photo" });
      }
      res.json(photo);
    } catch (error) {
      console.error("Error fetching photo:", error);
      res.status(500).json({ message: "Failed to fetch photo" });
    }
  });
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
      const dataUrlRegex = /^data:image\/([a-zA-Z+]+);base64,(.+)$/;
      const matches = photo.imageData.match(dataUrlRegex);
      if (!matches || matches.length !== 3) {
        return res.status(500).json({ message: "Invalid image data format" });
      }
      const imageType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");
      res.set("Content-Type", `image/${imageType}`);
      res.send(buffer);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });
  apiRouter.post("/photos", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      const { areaId, name = "Photo" } = req.body;
      if (!areaId) {
        return res.status(400).json({ message: "Area ID is required" });
      }
      const area = await storage.getAreaById(parseInt(areaId, 10));
      if (!area || area.userId !== userId) {
        return res.status(404).json({ message: "Area not found or doesn't belong to you" });
      }
      const fileExt = req.file.mimetype.split("/")[1];
      const filename = `${uuidv4()}.${fileExt}`;
      const imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
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
      if (error instanceof ZodError2) {
        return handleZodError(error, res);
      }
      res.status(500).json({ message: "Failed to create photo" });
    }
  });
  apiRouter.patch("/photos/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }
      const userId = req.session.userId;
      const { name } = req.body;
      if (!name || typeof name !== "string") {
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
  apiRouter.patch("/photos/:id/move", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }
      const userId = req.session.userId;
      const { areaId } = req.body;
      if (!areaId || typeof areaId !== "number") {
        return res.status(400).json({ message: "Area ID is required" });
      }
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
  apiRouter.delete("/photos/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }
      const userId = req.session.userId;
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
  apiRouter.get("/photos/:photoId/tags", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }
      const tags2 = await storage.getTagsByPhotoId(photoId);
      res.json(tags2);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });
  apiRouter.post("/photos/:photoId/tags", requireAuth, upload.single("tagImage"), async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }
      const userId = req.session.userId;
      const photo = await storage.getPhotoById(photoId);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      if (photo.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to add tags to this photo" });
      }
      const { description, details, notes, positionX, positionY } = req.body;
      let tagImage = null;
      if (req.file) {
        tagImage = req.file.buffer.toString("base64");
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
      if (error instanceof ZodError2) {
        return handleZodError(error, res);
      }
      res.status(500).json({ message: "Failed to create tag" });
    }
  });
  apiRouter.patch("/photos/:photoId/tags/:id", requireAuth, upload.single("tagImage"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tag ID" });
      }
      const userId = req.session.userId;
      const { description, details, notes } = req.body;
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }
      const currentTag = await storage.getTag(id);
      if (!currentTag || currentTag.userId !== userId) {
        return res.status(404).json({ message: "Tag not found or you don't have permission to update it" });
      }
      let tagImage = currentTag.tagImage;
      if (req.file) {
        tagImage = req.file.buffer.toString("base64");
      }
      const updatedTag = await storage.updateTag(
        id,
        description,
        details || "",
        notes || "",
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
  apiRouter.delete("/photos/:photoId/tags/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tag ID" });
      }
      const userId = req.session.userId;
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
  apiRouter.delete("/photos/:photoId/tags", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid photo ID" });
      }
      const userId = req.session.userId;
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
  app3.use("/api", apiRouter);
  const httpServer = createServer(app3);
  return httpServer;
}

// server/vite.ts
import express3 from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: "./",
  // ✅ Use relative paths for assets
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    // ✅ Output directly to dist/
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app3, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app3.use(vite.middlewares);
  app3.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app3) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app3.use(express3.static(distPath));
  app3.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app2 = express4();
app2.use(express4.json({ limit: "50mb" }));
app2.use(express4.urlencoded({ extended: false, limit: "50mb" }));
app2.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app2);
  app2.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app2.get("env") === "development") {
    await setupVite(app2, server);
  } else {
    serveStatic(app2);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
