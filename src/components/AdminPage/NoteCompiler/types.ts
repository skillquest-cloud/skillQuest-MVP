// Note Compiler — shared types
// Mirrors the JSON shape the frontend course reader already consumes,
// with media fields (video / image / svg) added at every level.

export interface MediaImage {
  url: string;
  alt?: string;
}

export interface NoteBlockMedia {
  video?: string; // YouTube URL, stored as given — the reader extracts the id
  image?: MediaImage;
  svg?: string; // raw inline SVG markup, rendered as-is
}

export interface NoteSubsection extends NoteBlockMedia {
  id: string;
  title: string;
  body: string;
}

export interface NoteSection extends NoteBlockMedia {
  id: string;
  title: string;
  body: string;
  subsections: NoteSubsection[];
}

export interface NoteDoc extends NoteBlockMedia {
  fileName: string; // e.g. "math101" — becomes math101.json on Drive
  title: string;
  introduction: string;
  sections: NoteSection[];
  course: string;
  level: string;
  subject: string;
  lastUpdated: string; // ISO timestamp, set on every save
}

export interface SaveDestination {
  course: string;
  level: string;
  subject: string;
}

export interface RecentDestination extends SaveDestination {
  label: string; // e.g. "Engineering · 200L · Statistics"
  folderId?: string;
}

export interface NoteSummary {
  fileName: string;
  title: string;
  course: string;
  level: string;
  subject: string;
  lastUpdated: string;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type PublishStatus = "idle" | "publishing" | "published" | "error";

export function blankNote(fileName: string): NoteDoc {
  return {
    fileName,
    title: "",
    introduction: "",
    sections: [],
    course: "",
    level: "",
    subject: "",
    lastUpdated: new Date().toISOString(),
  };
}

export function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Fills in whatever a raw JSON blob from Drive is missing before it ever
 * reaches a component. Notes published before the Note Compiler existed
 * (or edited by hand) can omit fields our editor assumes are always
 * present — most commonly `subsections` on a section that has none,
 * which was never required by the plain reader format. Without this,
 * SectionEditor's `.map()` on an undefined `subsections` throws during
 * render and takes down the whole page with no error boundary to catch it.
 */
export function normalizeNoteDoc(
  raw: unknown,
  fallbackFileName: string,
): NoteDoc {
  const r = (raw ?? {}) as Record<string, unknown>;

  const normalizeSubsection = (s: unknown): NoteSubsection => {
    const sub = (s ?? {}) as Record<string, unknown>;
    return {
      id: typeof sub.id === "string" && sub.id ? sub.id : makeId("sub"),
      title: typeof sub.title === "string" ? sub.title : "",
      body: typeof sub.body === "string" ? sub.body : "",
      video: typeof sub.video === "string" ? sub.video : undefined,
      image: (sub.image as NoteSubsection["image"]) ?? undefined,
      svg: typeof sub.svg === "string" ? sub.svg : undefined,
    };
  };

  const normalizeSection = (s: unknown): NoteSection => {
    const sec = (s ?? {}) as Record<string, unknown>;
    const rawSubsections = Array.isArray(sec.subsections)
      ? sec.subsections
      : [];
    return {
      id: typeof sec.id === "string" && sec.id ? sec.id : makeId("section"),
      title: typeof sec.title === "string" ? sec.title : "",
      body: typeof sec.body === "string" ? sec.body : "",
      video: typeof sec.video === "string" ? sec.video : undefined,
      image: (sec.image as NoteSection["image"]) ?? undefined,
      svg: typeof sec.svg === "string" ? sec.svg : undefined,
      subsections: rawSubsections.map(normalizeSubsection),
    };
  };

  const rawSections = Array.isArray(r.sections) ? r.sections : [];

  return {
    fileName:
      typeof r.fileName === "string" && r.fileName
        ? r.fileName
        : fallbackFileName,
    title: typeof r.title === "string" ? r.title : "",
    introduction:
      typeof r.introduction === "string"
        ? r.introduction
        : typeof r.intro === "string"
          ? r.intro
          : "",
    video: typeof r.video === "string" ? r.video : undefined,
    image: (r.image as NoteDoc["image"]) ?? undefined,
    svg: typeof r.svg === "string" ? r.svg : undefined,
    sections: rawSections.map(normalizeSection),
    course: typeof r.course === "string" ? r.course : "",
    level: typeof r.level === "string" ? r.level : "",
    subject: typeof r.subject === "string" ? r.subject : "",
    lastUpdated:
      typeof r.lastUpdated === "string"
        ? r.lastUpdated
        : new Date().toISOString(),
  };
}
