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
