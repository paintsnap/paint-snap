import { Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { RequestHandler } from "express";

// Function to handle Zod validation errors
export function handleZodError(error: ZodError, res: Response) {
  const validationError = fromZodError(error);
  return res.status(400).json({
    error: "Validation error",
    message: validationError.message,
    details: validationError.details
  });
}

// Auth middleware to check if user is authenticated
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};