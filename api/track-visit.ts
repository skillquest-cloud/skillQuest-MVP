import type { VercelRequest, VercelResponse } from "@vercel/node";
import { recordVisit } from "../lib/analytics.js";

/**
 * POST /api/track-visit
 * Body: { visitorId: string }
 * visitorId is an anonymous id generated client-side and stored in
 * localStorage — no login, no personal data, just enough to distinguish
 * "same browser came back" from "new visitor."
 * Fire-and-forget from the frontend, same as /api/track.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { visitorId } = req.body ?? {};
  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({ error: "Missing visitorId" });
  }

  try {
    await recordVisit(visitorId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to record visit:", err);
    return res.status(200).json({ ok: false });
  }
}
