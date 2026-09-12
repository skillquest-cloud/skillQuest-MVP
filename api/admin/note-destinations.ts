import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listAllNotes } from "../../lib/adminNotes.js";

/**
 * GET /api/admin/note-destinations
 * No separate storage for "recent" — derived from the most recently
 * updated published notes, deduped by course/level. Keeps this endpoint
 * honest: it can never show a destination that doesn't really exist.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const notes = await listAllNotes();
    const seen = new Set<string>();
    const recent: { course: string; level: string; subject: string; label: string }[] = [];

    for (const note of notes) {
      const key = `${note.course}::${note.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
      recent.push({
        course: note.course,
        level: note.level,
        subject: "",
        label: `${note.course} · ${note.level}`,
      });
      if (recent.length >= 5) break;
    }

    return res.status(200).json(recent);
  } catch (err) {
    console.error("note-destinations failed:", err);
    return res.status(502).json({ error: "Failed to load recent destinations" });
  }
}
