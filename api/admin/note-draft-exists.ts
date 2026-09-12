import type { VercelRequest, VercelResponse } from "@vercel/node";
import { draftExists } from "../../lib/adminNotes.js";

/** GET /api/admin/note-draft-exists?fileName=<name> → { exists: boolean } */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fileName } = req.query;
  if (!fileName || typeof fileName !== "string") {
    return res.status(400).json({ error: "Missing fileName query param" });
  }

  try {
    const exists = await draftExists(fileName);
    return res.status(200).json({ exists });
  } catch (err) {
    console.error("note-draft-exists failed:", err);
    return res.status(502).json({ error: "Draft check failed" });
  }
}
