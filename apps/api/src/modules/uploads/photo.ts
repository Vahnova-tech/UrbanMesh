import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../lib/env.js";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const PHOTO_PATH =
  /^\/uploads\/photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

export type SniffedImage = { ext: string; mime: string };

export function sniffImage(buf: Buffer): SniffedImage | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: ".png", mime: "image/png" };
  }
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: ".webp", mime: "image/webp" };
  }
  return null;
}

export function canonicalizePhotoPath(raw: string): string | null {
  try {
    const pathName = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw).pathname
      : raw.split("?")[0];
    if (!PHOTO_PATH.test(pathName)) return null;
    return pathName;
  } catch {
    return null;
  }
}

export function publicPhotoUrl(filename: string): string {
  const relative = `/uploads/photos/${filename}`;
  const base = env.photoPublicBaseUrl.replace(/\/$/, "");
  return base ? `${base}${relative}` : relative;
}

export async function savePhotoBuffer(buf: Buffer): Promise<string> {
  const sniffed = sniffImage(buf);
  if (!sniffed) {
    throw new PhotoError("Only JPEG, PNG, or WebP photos are accepted.");
  }
  if (buf.length > MAX_PHOTO_BYTES) {
    throw new PhotoError("Photo must be 2 MB or smaller.");
  }
  const dest = path.resolve(env.photoStoragePath);
  await mkdir(dest, { recursive: true });
  const filename = `${randomUUID()}${sniffed.ext}`;
  await writeFile(path.join(dest, filename), buf);
  return publicPhotoUrl(filename);
}

export async function resolveStoredPhotoUrl(
  raw: unknown,
): Promise<string | null> {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") {
    throw new PhotoError("That photo is not an UrbanMesh camera still.");
  }
  const relative = canonicalizePhotoPath(raw);
  if (!relative) {
    throw new PhotoError("That photo is not an UrbanMesh camera still.");
  }
  const filename = path.basename(relative);
  try {
    await access(
      path.join(path.resolve(env.photoStoragePath), filename),
      constants.R_OK,
    );
  } catch {
    throw new PhotoError("Photo was not found. Photograph the hazard again.");
  }
  return relative;
}

export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoError";
  }
}
