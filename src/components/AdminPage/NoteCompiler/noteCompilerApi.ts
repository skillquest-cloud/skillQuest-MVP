import type {
  NoteDoc,
  NoteSummary,
  RecentDestination,
  SaveDestination,
} from "./types";
import { normalizeNoteDoc } from "./types";

/**
 * Note Compiler API
 * ------------------
 * Thin client for a handful of serverless functions in api/admin/.
 * Consolidated to 4 files (not one per action) to stay under Vercel
 * Hobby's 12-function-per-deployment cap — each route branches on
 * method/query param internally instead.
 *
 * Files:
 *   api/admin/note-draft.ts    PUT save · GET ?fileName= load ·
 *                              GET ?fileName=&check=1 → { exists }
 *   api/admin/notes.ts         GET ?course=&level= list · GET ?fileName= load ·
 *                              POST { doc, destination } publish
 *   api/admin/note-meta.ts     GET ?type=courses | ?type=destinations
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
    const raw = await request<unknown>(
      `/note-draft?fileName=${encodeURIComponent(fileName)}`,
    );
    return normalizeNoteDoc(raw, fileName);
  } catch {
    return null;
  }
}

export async function hasDraft(fileName: string): Promise<boolean> {
  try {
    const { exists } = await request<{ exists: boolean }>(
      `/note-draft?fileName=${encodeURIComponent(fileName)}&check=1`,
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

export async function loadNote(fileName: string): Promise<NoteDoc> {
  const raw = await request<unknown>(
    `/notes?fileName=${encodeURIComponent(fileName)}`,
  );
  return normalizeNoteDoc(raw, fileName);
}

// ---------- Save destinations ----------

export function listRecentDestinations(): Promise<RecentDestination[]> {
  return request("/note-meta?type=destinations");
}

/** Distinct course names already used on Drive, for the Save dropdown. */
export function listCourses(): Promise<string[]> {
  return request("/note-meta?type=courses");
}

// ---------- Publish to Drive ----------

export function publishToDrive(
  doc: NoteDoc,
  destination: SaveDestination,
): Promise<{ lastUpdated: string; driveFileId: string }> {
  return request("/notes", {
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
