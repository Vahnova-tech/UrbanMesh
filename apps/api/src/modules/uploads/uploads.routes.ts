import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { rateLimit } from "../../lib/rateLimit.js";
import {
  MAX_PHOTO_BYTES,
  PhotoError,
  savePhotoBuffer,
} from "./photo.js";

const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
});

uploadsRouter.post(
  "/photos",
  rateLimit(),
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("photo")(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "Photo must be 2 MB or smaller" });
        return;
      }
      const message = err instanceof Error ? err.message : "Photo upload failed";
      res.status(400).json({ error: message });
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file?.buffer?.length) {
        res.status(400).json({ error: "Photograph the hazard and attach the still." });
        return;
      }
      const url = await savePhotoBuffer(file.buffer);
      res.status(201).json({ url });
    } catch (err) {
      if (err instanceof PhotoError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
);

export { uploadsRouter };
