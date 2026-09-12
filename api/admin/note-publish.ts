import type { VercelRequest, VercelResponse } from "@vercel/node";
import { publishNote } from "../../lib/adminNotes.js";

/**
 * POST /api/admin/note-publish
 * Body: { doc: NoteDoc, destination: { course, level, subject } }
 * Creates the course/level folders if they don't exist yet, writes
 * <subject>.json into the level folder (overwriting if it's already
 * there), and clears any leftover draft for that file name.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { doc, destination } = req.body ?? {};

  if (!doc?.fileName || typeof doc.fileName !== "string") {
    return res.status(400).json({ error: "doc.fileName is required" });
  }
  if (!destination?.course || !destination?.level || !destination?.subject) {
    return res.status(400).json({ error: "destination.course, .level and .subject are required" });
  }

  try {
    const result = await publishNote(doc, destination);
    return res.status(200).json(result);
  } catch (err) {
    console.error("note-publish failed:", err);
    return res.status(502).json({ error: "Failed to publish note" });
  }
}
