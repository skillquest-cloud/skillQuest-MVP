import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listAllNotes, listCourseNames } from "../../lib/adminNotes.js";

/**
 * GET /api/admin/note-meta?type=courses
 *   Distinct course folder names, for the Save modal's dropdown.
 *
 * GET /api/admin/note-meta?type=destinations
 *   Recent course/level combos (derived from the most recently updated
 *   published notes, deduped) for the Save modal's quick-pick list.
 *
 * Merged what used to be note-courses.ts and note-destinations.ts —
 * same reason as note-draft.ts: staying under Vercel Hobby's 12-function
 * deployment cap.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type } = req.query;

  try {
    if (type === "courses") {
      const courses = await listCourseNames();
      return res.status(200).json(courses);
    }

    if (type === "destinations") {
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
    }

    return res.status(400).json({ error: "type must be 'courses' or 'destinations'" });
  } catch (err) {
    console.error("note-meta failed:", err);
    return res.status(502).json({ error: "Failed to load note metadata" });
  }
}
