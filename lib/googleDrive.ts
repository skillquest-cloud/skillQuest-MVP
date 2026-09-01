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
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable"
    );
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

/** List child JSON files (not folders) of a given Drive folder id. */
export async function listChildJsonFiles(folderId: string) {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
    fields: "files(id, name)",
    orderBy: "name",
  });
  return res.data.files ?? [];
}

/** Fetch and parse a JSON file's contents by file id. */
export async function getJsonFileContent(fileId: string) {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "json" }
  );
  return res.data;
}
