import type { VercelRequest, VercelResponse } from "@vercel/node";
import { draftExists, loadDraft, saveDraft } from "../../lib/adminNotes.js";

/**
 * PUT /api/admin/note-draft
 *   Body: the full NoteDoc (must include fileName). Saves/overwrites the
 *   draft for that file name.
 *
 * GET /api/admin/note-draft?fileName=<name>
 *   Returns the draft's full JSON, 404 if none exists.
 *
 * GET /api/admin/note-draft?fileName=<name>&check=1
 *   Cheap existence check for the resume-draft prompt: { exists: boolean }
 *
 * Merged with what used to be a separate note-draft-exists.ts — Vercel's
 * Hobby plan caps a deployment at 12 serverless functions, and every file
 * under api/ counts as one, so related routes get folded into a single
 * function with query-based branching instead of one file each.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "PUT") {
      const doc = req.body as Record<string, unknown>;
      const lastUpdated = await saveDraft(doc);
      return res.status(200).json({ lastUpdated });
    }

    if (req.method === "GET") {
      const { fileName, check } = req.query;
      if (!fileName || typeof fileName !== "string") {
        return res.status(400).json({ error: "Missing fileName query param" });
      }

      if (check) {
        const exists = await draftExists(fileName);
        return res.status(200).json({ exists });
      }

      const draft = await loadDraft(fileName);
      if (!draft) return res.status(404).json({ error: "No draft found" });
      return res.status(200).json(draft);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("note-draft failed:", err);
    return res.status(502).json({ error: "Draft request failed" });
  }
}
