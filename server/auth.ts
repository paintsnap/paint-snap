import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Extending Express.User is done in routes/auth.ts

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express, sessionStore: session.Store) {
  const sessionSettings: session.SessionOptions = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'annotation-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: false, // Set to false for development to work over HTTP
      httpOnly: true,
      sameSite: 'lax', // Helps with CSRF protection
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Add middleware to log session info
  app.use((req, res, next) => {
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Try first by username
        let user = await storage.getUserByUsername(username);

        // If not found, try by email (for Firebase email users)
        if (!user) {
          user = await storage.getUserByEmail(username);
        }
        
        if (!user) {
          console.log(`No user found for username/email: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // For regular users - password check
        if (user.password) {
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            console.log(`Invalid password for user: ${username}`);
            return done(null, false, { message: "Invalid username or password" });
          }
        }
        // For Firebase users without password - can't use local auth
        else if (user.firebaseUid && !user.password) {
          console.log(`Firebase user ${username} attempted local login`);
          return done(null, false, { message: "Please use Firebase authentication" });
        }
        
        return done(null, user);
      } catch (error) {
        console.error("Error in local authentication:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => {
    const typedUser = user as unknown as User;
    console.log("Serializing user:", typedUser.id);
    done(null, typedUser.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
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