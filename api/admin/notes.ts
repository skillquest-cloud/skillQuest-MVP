import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listAllNotes, loadPublishedNote } from "../../lib/adminNotes.js";

/**
 * GET /api/admin/notes?fileName=<name>
 *   Returns one full published note (searches by name across all
 *   course/level folders), for the Edit picker.
 *
 * GET /api/admin/notes?course=&level=
 *   Returns a list of NoteSummary for the "Note Viewer" browse list.
 *   Both filters are optional — omit both to list everything.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fileName, course, level } = req.query;

  try {
    if (fileName && typeof fileName === "string") {
      const note = await loadPublishedNote(fileName);
      if (!note) return res.status(404).json({ error: "Note not found" });
      return res.status(200).json(note);
    }

    const notes = await listAllNotes({
      course: typeof course === "string" ? course : undefined,
      level: typeof level === "string" ? level : undefined,
    });
    return res.status(200).json(notes);
  } catch (err) {
    console.error("notes failed:", err);
    return res.status(502).json({ error: "Failed to load notes" });
  }
}
