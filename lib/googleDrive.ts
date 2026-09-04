import { google } from "googleapis";

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
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

export const FOLDER_MIME = "application/vnd.google-apps.folder";
export const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";

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
