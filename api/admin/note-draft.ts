import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadDraft, saveDraft } from "../../lib/adminNotes.js";

/**
 * PUT /api/admin/note-draft
 *   Body: the full NoteDoc (must include fileName). Overwrites the
 *   existing draft for that file name, or creates one.
 *
 * GET /api/admin/note-draft?fileName=<name>
 *   Returns the draft's full JSON, or 404 if none exists.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "PUT") {
      const doc = req.body as Record<string, unknown>;
      const lastUpdated = await saveDraft(doc);
      return res.status(200).json({ lastUpdated });
    }

    if (req.method === "GET") {
      const { fileName } = req.query;
      if (!fileName || typeof fileName !== "string") {
        return res.status(400).json({ error: "Missing fileName query param" });
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
