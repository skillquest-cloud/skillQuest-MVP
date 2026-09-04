import { listChildFolders } from "./googleDrive.js";
import { getSubjectsForLevel } from "./subjects.js";
import { cached } from "./cache.js";

export type SearchEntry =
  | { type: "course"; courseId: string; courseName: string }
  | {
      type: "subject";
      courseId: string;
      courseName: string;
      levelId: string;
      levelName: string;
      subjectId: string;
      subjectName: string;
    };

/**
 * Walks courses -> levels -> subjects and flattens everything into one
 * searchable list. This is the expensive part (many Drive calls), so
 * it's cached as a whole — rebuilt at most every 10 minutes, same as
 * the individual folder listings it's built from.
 */
async function buildSearchIndex(): Promise<SearchEntry[]> {
  const rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) return [];

  const courses = await listChildFolders(rootFolderId);
  const entries: SearchEntry[] = [];

  for (const course of courses) {
    if (!course.id || !course.name) continue;
    entries.push({
      type: "course",
      courseId: course.id,
      courseName: course.name,
    });

    const levels = await listChildFolders(course.id);
    for (const level of levels) {
      if (!level.id || !level.name) continue;

      const subjects = await getSubjectsForLevel(level.id, level.name);
      for (const subject of subjects) {
        entries.push({
          type: "subject",
          courseId: course.id,
          courseName: course.name,
          levelId: level.id,
          levelName: level.name,
          subjectId: subject.id,
          subjectName: subject.name,
        });
      }
    }
  }

  return entries;
}

export async function getSearchIndex(): Promise<SearchEntry[]> {
  return cached("search-index", buildSearchIndex);
}
