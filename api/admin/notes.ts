import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listAllNotes, loadPublishedNote, publishNote } from "../../lib/adminNotes.js";

/**
 * GET /api/admin/notes?fileName=<name>
 *   Loads one full published note (searches by name across course/level
 *   folders), for the Edit picker.
 *
 * GET /api/admin/notes?course=&level=
 *   Lists NoteSummary entries for the "Note Viewer" browse list. Both
 *   filters optional — omit both to list everything.
 *
 * POST /api/admin/notes
 *   Body: { doc: NoteDoc, destination: { course, level, subject } }
 *   Publishes (creates or overwrites) the note's JSON on Drive.
 *
 * Merged with what used to be a separate note-publish.ts — same reason
 * as note-draft.ts: staying under Vercel Hobby's 12-function cap.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const { fileName, course, level } = req.query;

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
    }

    if (req.method === "POST") {
      const { doc, destination } = req.body ?? {};

      if (!doc?.fileName || typeof doc.fileName !== "string") {
        return res.status(400).json({ error: "doc.fileName is required" });
      }
      if (!destination?.course || !destination?.level || !destination?.subject) {
        return res
          .status(400)
          .json({ error: "destination.course, .level and .subject are required" });
      }

      const result = await publishNote(doc, destination);
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("notes failed:", err);
    return res.status(502).json({ error: "Request failed" });
  }
}
