import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFile } from "node:fs/promises";
import { formidable } from "formidable";
import {
  findOrCreateChildFolder,
  uploadPublicImage,
} from "../../lib/googleDrive.js";
import { getRootFolderId } from "../../lib/adminNotes.js";
import { cached } from "../../lib/cache.js";

// Vercel's default JSON body parser can't handle multipart/form-data —
// formidable reads the raw request stream itself instead.
export const config = {
  api: { bodyParser: false },
};

async function getMediaFolderId(): Promise<string> {
  const rootId = getRootFolderId();
  return cached("admin:media-folder-id", async () => {
    const folder = await findOrCreateChildFolder(rootId, "_note_media");
    if (!folder.id)
      throw new Error("Could not get or create the _note_media folder");
    return folder.id;
  });
}

/**
 * POST /api/admin/note-image-upload
 * multipart/form-data with a single "file" field.
 * Returns { url } — a publicly viewable Drive link, ready to use as an
 * <img src>. Requires the "formidable" package (npm install formidable).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({ maxFileSize: 8 * 1024 * 1024 });
    const [, files] = await form.parse(req);

    const uploaded = files.file?.[0];
    if (!uploaded) {
      return res.status(400).json({ error: "Missing file field" });
    }

    const buffer = await readFile(uploaded.filepath);
    const mediaFolderId = await getMediaFolderId();
    const name = `${Date.now()}-${uploaded.originalFilename ?? "image"}`;
    const { url } = await uploadPublicImage(
      mediaFolderId,
      name,
      buffer,
      uploaded.mimetype ?? "application/octet-stream",
    );

    return res.status(200).json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload image";
    console.error("note-image-upload failed:", err);
    return res.status(502).json({ error: message });
  }
}
