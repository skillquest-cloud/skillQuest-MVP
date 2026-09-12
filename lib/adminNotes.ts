import {
  createJsonFile,
  deleteFile,
  findChildFileByName,
  findChildFolderByName,
  findOrCreateChildFolder,
  getFileMeta,
  getJsonFileContent,
  listChildFolders,
  listChildJsonFilesDetailed,
  updateJsonFileContent,
} from "./googleDrive.js";
import { cached, cacheInvalidate } from "./cache.js";

/**
 * Root folder that contains one subfolder per course (same folder your
 * public /api/courses route lists). If your course-listing route reads a
 * differently-named env var, change the line below to match — everything
 * else in this file is built on top of this one id.
 */
export function getRootFolderId(): string {
  const id = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!id) {
    throw new Error(
      "Missing DRIVE_ROOT_FOLDER_ID environment variable — set it to the " +
        "same root courses folder api/courses.ts already reads from.",
    );
  }
  return id;
}

/**
 * Drafts live in their own "_drafts" folder directly under the root, kept
 * separate from published content so they never show up for students and
 * never get mixed into listChildJsonFiles() calls on real course folders.
 */
async function getDraftsFolderId(): Promise<string> {
  const rootId = getRootFolderId();
  return cached("admin:drafts-folder-id", async () => {
    const folder = await findOrCreateChildFolder(rootId, "_drafts");
    if (!folder.id) throw new Error("Could not get or create the _drafts folder");
    return folder.id;
  });
}

function draftFileName(fileName: string) {
  return `${fileName}.draft.json`;
}

function stripJsonExt(name: string) {
  return name.replace(/\.json$/i, "");
}

// ---------- Drafts ----------

export async function saveDraft(doc: Record<string, unknown>): Promise<string> {
  const fileName = doc.fileName;
  if (typeof fileName !== "string" || !fileName) {
    throw new Error("Draft is missing fileName");
  }
  const draftsFolderId = await getDraftsFolderId();
  const name = draftFileName(fileName);
  const lastUpdated = new Date().toISOString();
  const content = { ...doc, lastUpdated };

  const existing = await findChildFileByName(draftsFolderId, name);
  if (existing?.id) {
    await updateJsonFileContent(existing.id, content);
  } else {
    await createJsonFile(draftsFolderId, name, content);
  }
  return lastUpdated;
}

export async function loadDraft(fileName: string): Promise<unknown | null> {
  const draftsFolderId = await getDraftsFolderId();
  const file = await findChildFileByName(draftsFolderId, draftFileName(fileName));
  if (!file?.id) return null;
  return getJsonFileContent(file.id);
}

export async function draftExists(fileName: string): Promise<boolean> {
  const draftsFolderId = await getDraftsFolderId();
  const file = await findChildFileByName(draftsFolderId, draftFileName(fileName));
  return Boolean(file?.id);
}

/** Removes the draft once a note has been published — publishing "uses up"
 *  the draft so a stale resume prompt doesn't show up next time. */
export async function clearDraft(fileName: string): Promise<void> {
  const draftsFolderId = await getDraftsFolderId();
  const file = await findChildFileByName(draftsFolderId, draftFileName(fileName));
  if (file?.id) await deleteFile(file.id);
}

// ---------- Courses ----------

export async function listCourseNames(): Promise<string[]> {
  const rootId = getRootFolderId();
  const folders = await cached("admin:courses", () => listChildFolders(rootId), 5 * 60 * 1000);
  return folders.map((f) => f.name ?? "").filter(Boolean);
}

// ---------- Publish ----------

/** Finds (or creates) the course/level folders and writes the note's JSON
 *  into them. The published file only contains what the public reader
 *  expects — course/level/subject live in the folder path itself, not
 *  duplicated inside the file, matching how the rest of the content is
 *  structured. */
export async function publishNote(
  doc: {
    fileName: string;
    title: string;
    introduction: string;
    sections: unknown;
    video?: string;
    image?: unknown;
    svg?: string;
  },
  destination: { course: string; level: string; subject: string },
): Promise<{ lastUpdated: string; driveFileId: string }> {
  const rootId = getRootFolderId();
  const courseFolder = await findOrCreateChildFolder(rootId, destination.course);
  if (!courseFolder.id) throw new Error("Could not get or create course folder");

  const levelFolder = await findOrCreateChildFolder(courseFolder.id, destination.level);
  if (!levelFolder.id) throw new Error("Could not get or create level folder");

  const fileTitle = `${destination.subject}.json`;
  const content = {
    title: doc.title,
    introduction: doc.introduction,
    sections: doc.sections,
    ...(doc.video ? { video: doc.video } : {}),
    ...(doc.image ? { image: doc.image } : {}),
    ...(doc.svg ? { svg: doc.svg } : {}),
  };

  const existing = await findChildFileByName(levelFolder.id, fileTitle, "application/json");
  const result = existing?.id
    ? await updateJsonFileContent(existing.id, content)
    : await createJsonFile(levelFolder.id, fileTitle, content);

  if (!result.id) throw new Error("Drive did not return a file id after publish");

  // The notes list and course dropdown may now be stale — drop them so the
  // next load reflects this write instead of waiting out the TTL.
  cacheInvalidate("admin:courses");
  cacheInvalidate(`admin:level-notes:${levelFolder.id}`);
  await clearDraft(doc.fileName).catch(() => undefined);

  return {
    lastUpdated: result.modifiedTime ?? new Date().toISOString(),
    driveFileId: result.id,
  };
}

// ---------- Listing / loading published notes ----------

export interface NoteSummaryResult {
  fileName: string;
  title: string;
  course: string;
  level: string;
  subject: string;
  lastUpdated: string;
}

async function notesInLevel(
  levelId: string,
  courseName: string,
  levelName: string,
): Promise<NoteSummaryResult[]> {
  return cached(
    `admin:level-notes:${levelId}`,
    async () => {
      const files = await listChildJsonFilesDetailed(levelId);
      const summaries = await Promise.all(
        files.map(async (f) => {
          const fileName = stripJsonExt(f.name ?? "");
          let title = fileName;
          try {
            // Shares the same cache entry api/note.ts already fills, so
            // listing notes here doesn't cost extra reads once a note's
            // been viewed once through the public reader (or vice versa).
            const content = (await cached(`note:${f.id}`, () => getJsonFileContent(f.id!), 30 * 60 * 1000)) as {
              title?: string;
            };
            if (content?.title) title = content.title;
          } catch {
            // Fall back to the file name if content can't be read.
          }
          return {
            fileName,
            title,
            course: courseName,
            level: levelName,
            subject: fileName,
            lastUpdated: f.modifiedTime ?? "",
          };
        }),
      );
      return summaries;
    },
    2 * 60 * 1000,
  );
}

export async function listAllNotes(filter?: {
  course?: string;
  level?: string;
}): Promise<NoteSummaryResult[]> {
  const rootId = getRootFolderId();
  const courseFolders = filter?.course
    ? [await findChildFolderByName(rootId, filter.course)].filter(
        (f): f is { id: string; name: string } => Boolean(f?.id),
      )
    : (await listChildFolders(rootId)).filter(
        (f): f is { id: string; name: string } => Boolean(f.id && f.name),
      );

  const results: NoteSummaryResult[] = [];
  for (const course of courseFolders) {
    const levelFolders = filter?.level
      ? [await findChildFolderByName(course.id, filter.level)].filter(
          (f): f is { id: string; name: string } => Boolean(f?.id),
        )
      : (await listChildFolders(course.id)).filter(
          (f): f is { id: string; name: string } => Boolean(f.id && f.name),
        );

    for (const level of levelFolders) {
      const notes = await notesInLevel(level.id, course.name, level.name ?? "");
      results.push(...notes);
    }
  }

  results.sort((a, b) => (b.lastUpdated || "").localeCompare(a.lastUpdated || ""));
  return results;
}

/** Loads one published note by file name alone — searches globally rather
 *  than requiring the caller to already know its course/level, since the
 *  Edit picker only has the file name to go on. */
export async function loadPublishedNote(fileName: string) {
  const rootId = getRootFolderId();
  // Search is scoped by walking course → level folders rather than a bare
  // Drive-wide name query, so drafts and unrelated files can never match.
  const courseFolders = await listChildFolders(rootId);
  for (const course of courseFolders) {
    if (!course.id) continue;
    const levelFolders = await listChildFolders(course.id);
    for (const level of levelFolders) {
      if (!level.id) continue;
      const file = await findChildFileByName(level.id, `${fileName}.json`, "application/json");
      if (file?.id) {
        const content = (await getJsonFileContent(file.id)) as Record<string, unknown>;
        const meta = await getFileMeta(file.id);
        return {
          ...content,
          fileName,
          course: course.name ?? "",
          level: level.name ?? "",
          subject: fileName,
          lastUpdated: meta.modifiedTime ?? "",
        };
      }
    }
  }
  return null;
}
