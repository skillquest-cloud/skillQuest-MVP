import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSubjectsForLevel } from "../lib/subjects.js";

/**
 * GET /api/subjects?levelId=<driveFolderId>&levelName=<e.g. 100lvl>
 * Returns the subject note files for this course's level, merged with
 * any shared subjects for that level name.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { levelId, levelName } = req.query;
  if (!levelId || typeof levelId !== "string") {
    return res.status(400).json({ error: "Missing levelId query param" });
  }

  try {
    const subjects = await getSubjectsForLevel(
      levelId,
      typeof levelName === "string" ? levelName : undefined,
    );
    return res.status(200).json({ subjects });
  } catch (err) {
    console.error("Failed to list subjects:", err);
    return res.status(502).json({ error: "Failed to load subjects" });
  }
}
