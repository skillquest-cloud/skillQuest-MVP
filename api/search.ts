import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSearchIndex } from "../lib/searchIndex.js";
import { fuzzyMatch } from "../lib/fuzzyMatch.js";

/**
 * GET /api/search?q=<query>
 * Searches both course names and subject names, tolerant of typos and
 * abbreviation differences (see lib/fuzzyMatch.ts). Returns up to 25
 * matches, courses first, then subjects.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { q } = req.query;
  const query = typeof q === "string" ? q.trim() : "";
  if (!query) {
    return res.status(200).json({ results: [] });
  }

  try {
    const index = await getSearchIndex();

    const results = index.filter((entry) =>
      entry.type === "course"
        ? fuzzyMatch(query, entry.courseName)
        : fuzzyMatch(query, entry.subjectName)
    );

    // Courses first, then subjects, capped to keep the response light.
    const sorted = [
      ...results.filter((r) => r.type === "course"),
      ...results.filter((r) => r.type === "subject"),
    ].slice(0, 25);

    return res.status(200).json({ results: sorted });
  } catch (err) {
    console.error("Search failed:", err);
    return res.status(502).json({ error: "Search failed" });
  }
}
