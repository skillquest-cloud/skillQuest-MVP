import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getStats } from "../../lib/analytics";

/**
 * GET /api/admin/stats
 * Returns total clicks today, total clicks all-time, and a breakdown
 * by course-level label, sorted highest first.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stats = await getStats();
    return res.status(200).json(stats);
  } catch (err) {
    console.error("Failed to load stats:", err);
    return res.status(502).json({ error: "Failed to load stats" });
  }
}
