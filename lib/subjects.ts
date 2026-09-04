import { listChildJsonFiles, findChildFolderByName } from "./googleDrive.js";
import { cached } from "./cache.js";

export type SubjectItem = { id: string; name: string };

/**
 * Returns the subjects for a course's level: the course-specific files
 * PLUS any shared subjects for that level name (e.g. MTH101 — courses
 * every department offers, living once in DRIVE_SHARED_FOLDER_ID).
 * Used by both /api/subjects and the search index, so the two never
 * drift out of sync with each other.
 */
export async function getSubjectsForLevel(
  levelId: string,
  levelName: string | undefined
): Promise<SubjectItem[]> {
  const files = await cached(`subjects:${levelId}`, () =>
    listChildJsonFiles(levelId)
  );

  let sharedFiles: Awaited<ReturnType<typeof listChildJsonFiles>> = [];
  const sharedRootId = process.env.DRIVE_SHARED_FOLDER_ID;
  if (sharedRootId && levelName) {
    sharedFiles = await cached(`shared-subjects:${levelName}`, async () => {
      const sharedLevelFolder = await findChildFolderByName(
        sharedRootId,
        levelName
      );
      if (!sharedLevelFolder?.id) return [];
      return listChildJsonFiles(sharedLevelFolder.id);
    });
  }

  // Course-specific subjects first, shared ones after; de-duped by id.
  const seen = new Set<string>();
  const combined = [...files, ...sharedFiles].filter((f) => {
    if (!f.id || seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });

  return combined.map((f) => ({
    id: f.id as string,
    name: f.name?.replace(/\.json$/i, "") ?? (f.name as string),
  }));
}
