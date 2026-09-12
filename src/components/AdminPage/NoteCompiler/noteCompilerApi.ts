import type {
  NoteDoc,
  NoteSummary,
  RecentDestination,
  SaveDestination,
} from "./types";

/**
 * Note Compiler API
 * ------------------
 * Thin client for a handful of new serverless functions living in
 * api/admin/ next to your existing admin routes. Matches the rest of the
 * app's convention: flat files, query params instead of path segments
 * (see api/note.ts's ?fileId= for the pattern), same Drive service
 * account your other api/*.ts files already use.
 *
 * Files to add:
 *   api/admin/note-draft.ts          PUT save draft · GET ?fileName= load draft
 *   api/admin/note-draft-exists.ts   GET ?fileName= → { exists: boolean }
 *   api/admin/notes.ts               GET ?course=&level=&subject= list
 *                                     GET ?fileName= load one full note
 *   api/admin/note-destinations.ts   GET → recent course/level/subject combos
 *   api/admin/note-courses.ts        GET → distinct course names already in Drive
 *   api/admin/note-publish.ts        POST { doc, destination } → writes to Drive
 *   api/admin/note-image-upload.ts   POST FormData → { url }
 */

const BASE = "/api/admin";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res.json() as Promise<T>;
}

// ---------- Draft autosave ----------

export function saveDraft(doc: NoteDoc): Promise<{ lastUpdated: string }> {
  return request("/note-draft", { method: "PUT", body: JSON.stringify(doc) });
}

export async function loadDraft(fileName: string): Promise<NoteDoc | null> {
  try {
    return await request<NoteDoc>(
      `/note-draft?fileName=${encodeURIComponent(fileName)}`,
    );
  } catch {
    return null;
  }
}

export async function hasDraft(fileName: string): Promise<boolean> {
  try {
    const { exists } = await request<{ exists: boolean }>(
      `/note-draft-exists?fileName=${encodeURIComponent(fileName)}`,
    );
    return exists;
  } catch {
    return false;
  }
}

// ---------- Published notes ----------

export function listNotes(
  filter?: Partial<SaveDestination>,
): Promise<NoteSummary[]> {
  const params = new URLSearchParams(
    Object.entries(filter ?? {}).filter(([, v]) => Boolean(v)) as [
      string,
      string,
    ][],
  );
  const qs = params.toString();
  return request(`/notes${qs ? `?${qs}` : ""}`);
}

export function loadNote(fileName: string): Promise<NoteDoc> {
  return request(`/notes?fileName=${encodeURIComponent(fileName)}`);
}

// ---------- Save destinations ----------

export function listRecentDestinations(): Promise<RecentDestination[]> {
  return request("/note-destinations");
}

/** Distinct course names already used on Drive, for the Save dropdown. */
export function listCourses(): Promise<string[]> {
  return request("/note-courses");
}

// ---------- Publish to Drive ----------

export function publishToDrive(
  doc: NoteDoc,
  destination: SaveDestination,
): Promise<{ lastUpdated: string; driveFileId: string }> {
  return request("/note-publish", {
    method: "POST",
    body: JSON.stringify({ doc, destination }),
  });
}

// ---------- Media uploads ----------

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/note-image-upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`note-image-upload failed (${res.status})`);
  return res.json();
}
