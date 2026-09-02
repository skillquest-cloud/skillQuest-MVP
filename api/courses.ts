import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listChildFolders } from "../lib/googleDrive.js";
import { cached } from "../lib/cache.js";

/**
 * GET /api/courses
 * Returns the course folders directly under your Drive root folder.
 * Set DRIVE_ROOT_FOLDER_ID in Vercel env vars to that root folder's id.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    return res
      .status(500)
      .json({ error: "Missing DRIVE_ROOT_FOLDER_ID environment variable" });
  }

  try {
    const courses = await cached("courses", () =>
      listChildFolders(rootFolderId),
    );
    return res.status(200).json({ courses });
  } catch (err) {
    console.error("Failed to list courses:", err);
    return res.status(502).json({ error: "Failed to load courses" });
  }
}
