import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listChildJsonFiles } from "../lib/googleDrive";
import { cached } from "../lib/cache";

/**
 * GET /api/subjects?levelId=<driveFolderId>
 * Returns the subject note files (each a .json file) inside a level folder.
 * Each file IS the subject — clicking one loads it directly as a note.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { levelId } = req.query;
  if (!levelId || typeof levelId !== "string") {
    return res.status(400).json({ error: "Missing levelId query param" });
  }

  try {
    const files = await cached(`subjects:${levelId}`, () =>
      listChildJsonFiles(levelId)
    );
    // Strip the .json extension for display names.
    const subjects = files.map((f) => ({
      id: f.id,
      name: f.name?.replace(/\.json$/i, "") ?? f.name,
    }));
    return res.status(200).json({ subjects });
  } catch (err) {
    console.error("Failed to list subjects:", err);
    return res.status(502).json({ error: "Failed to load subjects" });
  }
}
