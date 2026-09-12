import { google } from "googleapis";
import { Readable } from "node:stream";

/**
 * Reads the service account credentials from an environment variable.
 * Set GOOGLE_SERVICE_ACCOUNT_KEY in Vercel (Project Settings → Environment
 * Variables) to the full JSON key content, as a single-line string.
 * NEVER commit this key or paste it into chat/code — env var only.
 */
function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable");
  }
  return JSON.parse(raw);
}

let driveClient: ReturnType<typeof google.drive> | null = null;

export function getDrive() {
  if (driveClient) return driveClient;

  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    // Full Drive scope, not drive.readonly — the Note Compiler admin
    // routes create and update files. Sharing the service account as
    // "Editor" on a folder only controls WHAT it can touch; this scope
    // controls WHETHER the token it presents is even allowed to write
    // at all. With drive.readonly, every create/update call is rejected
    // before Drive even checks folder-level permissions.
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

export const FOLDER_MIME = "application/vnd.google-apps.folder";
export const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
export const JSON_MIME = "application/json";

/** List child folders of a given Drive folder id. */
export async function listChildFolders(folderId: string) {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: "files(id, name)",
    orderBy: "name",
  });
  return res.data.files ?? [];
}

/** Find a single child folder by exact name (case-insensitive). */
export async function findChildFolderByName(parentId: string, name: string) {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false and name='${name.replace(/'/g, "\\'")}'`,
    fields: "files(id, name)",
  });
  return res.data.files?.[0] ?? null;
}
/**
 * List child JSON files (not folders) of a given Drive folder id —
 * including shortcuts that point to a JSON file elsewhere. A shortcut
 * is resolved to its real target's id, so the rest of the app never
 * needs to know it wasn't a real file sitting in this folder.
 */
export async function listChildJsonFiles(folderId: string) {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType='application/json' or mimeType='${SHORTCUT_MIME}') and trashed=false`,
    fields:
      "files(id, name, mimeType, shortcutDetails(targetId, targetMimeType))",
    orderBy: "name",
  });

  const files = res.data.files ?? [];
  return files
    .filter(
      (f) =>
        f.mimeType === "application/json" ||
        f.shortcutDetails?.targetMimeType === "application/json",
    )
    .map((f) => {
      if (f.mimeType === SHORTCUT_MIME && f.shortcutDetails?.targetId) {
        // Use the real file's id, not the shortcut's — so /api/note
        // fetches the actual content without any extra resolving step.
        return { id: f.shortcutDetails.targetId, name: f.name };
      }
      return { id: f.id, name: f.name };
    });
}

/** Fetch and parse a JSON file's contents by file id. */
export async function getJsonFileContent(fileId: string) {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "json" },
  );
  return res.data;
}

// ============================================================
// Note Compiler additions — folder management, writes, uploads
// ============================================================

/**
 * Find a direct child FILE (not folder) by exact name. Shortcuts are not
 * resolved here (unlike listChildJsonFiles) — draft/publish lookups deal
 * in real files they created themselves, never shortcuts.
 */
export async function findChildFileByName(
  parentId: string,
  name: string,
  mimeType?: string,
) {
  const drive = getDrive();
  const mimeClause = mimeType ? ` and mimeType='${mimeType}'` : "";
  const res = await drive.files.list({
    q: `'${parentId}' in parents and trashed=false and name='${name.replace(/'/g, "\\'")}'${mimeClause}`,
    fields: "files(id, name, modifiedTime)",
  });
  return res.data.files?.[0] ?? null;
}

/** Same as listChildJsonFiles, but also returns modifiedTime — used for
 *  the admin notes list (sort/display "last updated"), which the public
 *  reader route never needed. */
export async function listChildJsonFilesDetailed(folderId: string) {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='${JSON_MIME}' and trashed=false`,
    fields: "files(id, name, modifiedTime)",
    orderBy: "name",
  });
  return res.data.files ?? [];
}

/** Get or create a child folder by name — used when publishing to a
 *  course/level combo that doesn't have a Drive folder yet. */
export async function findOrCreateChildFolder(parentId: string, name: string) {
  const existing = await findChildFolderByName(parentId, name);
  if (existing?.id) return existing;

  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id, name",
  });
  return res.data;
}

/** Create a new JSON file in a folder with the given content. */
export async function createJsonFile(
  parentId: string,
  name: string,
  content: unknown,
) {
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: { name, mimeType: JSON_MIME, parents: [parentId] },
    media: { mimeType: JSON_MIME, body: JSON.stringify(content, null, 2) },
    fields: "id, name, modifiedTime",
  });
  return res.data;
}

/** Overwrite an existing JSON file's content in place (keeps the same id). */
export async function updateJsonFileContent(fileId: string, content: unknown) {
  const drive = getDrive();
  const res = await drive.files.update({
    fileId,
    media: { mimeType: JSON_MIME, body: JSON.stringify(content, null, 2) },
    fields: "id, name, modifiedTime",
  });
  return res.data;
}

/** Permanently delete a file — used when a draft is discarded or published. */
export async function deleteFile(fileId: string) {
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

/** Fetch a file's parent folder id and name in one call. */
export async function getFileMeta(fileId: string) {
  const drive = getDrive();
  const res = await drive.files.get({
    fileId,
    fields: "id, name, modifiedTime, parents",
  });
  return res.data;
}

/** Upload a binary file (an image dropped into the note compiler) and make
 *  it publicly viewable so it can be used as an <img src>. */
export async function uploadPublicImage(
  parentId: string,
  name: string,
  buffer: Buffer,
  mimeType: string,
) {
  const drive = getDrive();
  const created = await drive.files.create({
    requestBody: { name, mimeType, parents: [parentId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
  });

  const fileId = created.data.id;
  if (!fileId) throw new Error("Drive upload did not return a file id");

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId,
    url: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
}
