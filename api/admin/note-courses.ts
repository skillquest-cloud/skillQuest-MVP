import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listCourseNames } from "../../lib/adminNotes.js";

/** GET /api/admin/note-courses → string[] */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const courses = await listCourseNames();
    return res.status(200).json(courses);
  } catch (err) {
    console.error("note-courses failed:", err);
    return res.status(502).json({ error: "Failed to load courses" });
  }
}
