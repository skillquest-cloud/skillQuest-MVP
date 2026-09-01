import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getJsonFileContent } from "../lib/googleDrive";
import { cached } from "../lib/cache";

/**
 * GET /api/note?fileId=<driveFileId>
 * Returns the parsed JSON content of a single note file, matching the
 * NoteData shape the NoteReader component expects (title, introduction,
 * sections[]).
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fileId } = req.query;
  if (!fileId || typeof fileId !== "string") {
    return res.status(400).json({ error: "Missing fileId query param" });
  }

  try {
    // Notes rarely change once published, so cache longer than folder listings.
    const note = await cached(
      `note:${fileId}`,
      () => getJsonFileContent(fileId),
      30 * 60 * 1000 // 30 minutes
    );
    return res.status(200).json(note);
  } catch (err) {
    console.error("Failed to load note:", err);
    return res.status(502).json({ error: "Failed to load note" });
  }
}
