import { useEffect, useState } from "react";
import type { NoteSummary, RecentDestination, SaveDestination } from "./types";
import { listNotes, listRecentDestinations } from "./noteCompilerApi";

// ---------- Shell ----------

export function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal${wide ? " modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

// ---------- New note ----------

export function NewNoteModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (fileName: string, title: string) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const cleanFileName = fileName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");

  return (
    <ModalShell title="New note" onClose={onClose}>
      <label className="field-label field-label--sm">File name</label>
      <input
        className="field-input"
        type="text"
        placeholder="e.g. math101"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        autoFocus
      />
      {cleanFileName && <p className="modal__hint">Saves as {cleanFileName}.json</p>}

      <label className="field-label field-label--sm" style={{ marginTop: 14 }}>
        Title
      </label>
      <input
        className="field-input"
        type="text"
        placeholder="e.g. Introduction to Statistics & Data Analytics"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!cleanFileName}
          onClick={() => onCreate(cleanFileName, title)}
        >
          Create note
        </button>
      </div>
    </ModalShell>
  );
}

// ---------- Save ----------

export function SaveModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (destination: SaveDestination) => void;
  initial: SaveDestination;
}) {
  const [recent, setRecent] = useState<RecentDestination[] | null>(null);
  const [course, setCourse] = useState(initial.course);
  const [level, setLevel] = useState(initial.level);
  const [subject, setSubject] = useState(initial.subject);

  useEffect(() => {
    listRecentDestinations()
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  const canSave = course.trim() && level.trim() && subject.trim();

  return (
    <ModalShell title="Save to Drive" onClose={onClose}>
      {recent && recent.length > 0 && (
        <>
          <label className="field-label field-label--sm">Recent</label>
          <div className="recent-list">
            {recent.map((dest, i) => (
              <button
                key={i}
                type="button"
                className="recent-item"
                onClick={() => onSave(dest)}
              >
                {dest.label}
              </button>
            ))}
          </div>
          <div className="modal__divider">or choose a destination</div>
        </>
      )}

      <label className="field-label field-label--sm">Course</label>
      <input
        className="field-input"
        type="text"
        placeholder="e.g. Engineering"
        value={course}
        onChange={(e) => setCourse(e.target.value)}
      />

      <label className="field-label field-label--sm" style={{ marginTop: 10 }}>
        Level
      </label>
      <input
        className="field-input"
        type="text"
        placeholder="e.g. 200L"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
      />

      <label className="field-label field-label--sm" style={{ marginTop: 10 }}>
        Subject
      </label>
      <input
        className="field-input"
        type="text"
        placeholder="e.g. Statistics"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canSave}
          onClick={() => onSave({ course, level, subject })}
        >
          Save to Drive
        </button>
      </div>
    </ModalShell>
  );
}

// ---------- Edit / pick existing note ----------

export function NotePickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (fileName: string) => void;
}) {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listNotes()
      .then(setNotes)
      .catch(() => setNotes([]));
  }, []);

  const filtered = (notes ?? []).filter((n) =>
    `${n.title} ${n.course} ${n.level} ${n.subject}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <ModalShell title="Edit a note" onClose={onClose} wide>
      <input
        className="field-input"
        type="text"
        placeholder="Search by title, course, level, or subject"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="note-picker-list">
        {notes === null && <p className="modal__hint">Loading notes…</p>}
        {notes !== null && filtered.length === 0 && (
          <p className="modal__hint">No notes match that search.</p>
        )}
        {filtered.map((note) => (
          <button
            key={note.fileName}
            type="button"
            className="note-picker-item"
            onClick={() => onPick(note.fileName)}
          >
            <span className="note-picker-item__title">{note.title || note.fileName}</span>
            <span className="note-picker-item__meta">
              {[note.course, note.level, note.subject].filter(Boolean).join(" · ")}
            </span>
            <span className="note-picker-item__date">
              Updated {new Date(note.lastUpdated).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

// ---------- Resume draft ----------

export function ResumeDraftModal({
  fileName,
  onContinue,
  onDiscard,
}: {
  fileName: string;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  return (
    <ModalShell title="Unsaved changes" onClose={onContinue}>
      <p className="modal__hint">
        {fileName}.json has changes from your last session that haven't been published to Drive
        yet.
      </p>
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onDiscard}>
          Discard draft
        </button>
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          Continue editing
        </button>
      </div>
    </ModalShell>
  );
}
