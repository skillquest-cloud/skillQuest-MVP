import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listChildFolders } from "../lib/googleDrive.js";
import { cached } from "../lib/cache.js";

/**
 * GET /api/levels?courseId=<driveFolderId>
 * Returns the level folders (100lvl, 200lvl, ...) inside a course folder.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { courseId } = req.query;
  if (!courseId || typeof courseId !== "string") {
    return res.status(400).json({ error: "Missing courseId query param" });
  }

  try {
    const levels = await cached(`levels:${courseId}`, () =>
      listChildFolders(courseId),
    );
    return res.status(200).json({ levels });
  } catch (err) {
    console.error("Failed to list levels:", err);
    return res.status(502).json({ error: "Failed to load levels" });
  }
}
