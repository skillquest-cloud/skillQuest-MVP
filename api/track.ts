import type { VercelRequest, VercelResponse } from "@vercel/node";
import { recordClick } from "../lib/analytics.js";

/**
 * POST /api/track
 * Body: { label: string }
 * label is a display string identifying what was clicked, e.g. "Law · 200lvl".
 * Fire-and-forget from the frontend — failures here should never block
 * the user's actual navigation.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { label } = req.body ?? {};
  if (!label || typeof label !== "string") {
    return res.status(400).json({ error: "Missing label" });
  }

  try {
    await recordClick(label);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to record click:", err);
    // Still 200 — an analytics hiccup shouldn't surface as an error to the user.
    return res.status(200).json({ ok: false });
  }
}
