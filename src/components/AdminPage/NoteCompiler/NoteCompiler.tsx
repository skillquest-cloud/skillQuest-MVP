import { useEffect, useRef, useState } from "react";
import type {
  NoteDoc,
  SaveDestination,
  SaveStatus,
  PublishStatus,
} from "./types";
import { blankNote } from "./types";
import {
  hasDraft,
  loadDraft,
  loadNote,
  publishToDrive,
  saveDraft,
} from "./noteCompilerApi";
import { SectionEditor } from "./SectionEditor";
import { MediaFields } from "./MediaFields";
import { NotePreview } from "./NotePreview";
import {
  NewNoteModal,
  NotesModal,
  ResumeDraftModal,
  SaveModal,
  type SaveModalDestination,
} from "./modals";
import "./NoteCompiler.css";

type ModalKind = "new" | "save" | "notes" | null;

const AUTOSAVE_DELAY_MS = 1200;
const DEFAULT_FILE_NAME = "untitled";

export default function NoteCompiler() {
  const [doc, setDoc] = useState<NoteDoc>(() => blankNote(DEFAULT_FILE_NAME));
  const [modal, setModal] = useState<ModalKind>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [resumePrompt, setResumePrompt] = useState<string | null>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const skipNextAutosave = useRef(false);

  // Check for an unfinished draft of the default file on first load.
  useEffect(() => {
    hasDraft(DEFAULT_FILE_NAME).then((exists) => {
      if (exists) setResumePrompt(DEFAULT_FILE_NAME);
    });
  }, []);

  // Debounced autosave whenever the doc changes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveStatus("saving");
    autosaveTimer.current = setTimeout(async () => {
      try {
        const { lastUpdated } = await saveDraft(doc);
        setDoc((d) =>
          d.fileName === doc.fileName ? { ...d, lastUpdated } : d,
        );
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  function loadWithoutAutosaving(next: NoteDoc) {
    skipNextAutosave.current = true;
    setDoc(next);
    setPublishStatus("idle");
  }

  async function handleResumeContinue() {
    if (!resumePrompt) return;
    const draft = await loadDraft(resumePrompt);
    if (draft) loadWithoutAutosaving(draft);
    setResumePrompt(null);
  }

  function handleResumeDiscard() {
    setResumePrompt(null);
  }

  function handleCreateNote(fileName: string, title: string) {
    loadWithoutAutosaving({ ...blankNote(fileName), title });
    setModal(null);
  }

  async function handlePickNote(fileName: string) {
    const note = await loadNote(fileName);
    loadWithoutAutosaving(note);
    setModal(null);
  }

  async function handleSave(partial: SaveModalDestination) {
    // The file name IS the subject/topic identifier — no separate field to fill in.
    const destination: SaveDestination = { ...partial, subject: doc.fileName };
    setPublishStatus("publishing");
    try {
      const { lastUpdated } = await publishToDrive(doc, destination);
      setDoc((d) => ({ ...d, ...destination, lastUpdated }));
      setPublishStatus("published");
      setModal(null);
    } catch {
      setPublishStatus("error");
    }
  }

  const statusLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "error"
        ? "Couldn't save draft"
        : saveStatus === "saved"
          ? `Draft saved · updated ${new Date(
              doc.lastUpdated,
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "";

  return (
    <div className="note-compiler">
      <header className="nc-topbar">
        <div className="nc-topbar__identity">
          <span className="nc-topbar__mark">NC</span>
          <div>
            <h1 className="nc-topbar__title">
              {doc.title.trim() || "Untitled note"}
              <span className="nc-topbar__filename">{doc.fileName}.json</span>
            </h1>
            <p className="nc-topbar__destination">
              {[doc.course, doc.level, doc.subject]
                .filter(Boolean)
                .join(" · ") || "Not saved to a folder yet"}
            </p>
          </div>
        </div>

        <div className="nc-topbar__actions">
          <span className={`nc-status nc-status--${saveStatus}`}>
            {statusLabel}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setModal("new")}
          >
            New
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setModal("notes")}
          >
            Note Viewer
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setModal("save")}
          >
            Save
          </button>
        </div>
      </header>

      <main className="nc-workspace">
        <section className="pane pane--editor" aria-label="Editor">
          <div className="pane__scroll">
            <div className="field-group">
              <label className="field-label" htmlFor="nc-title">
                Title
              </label>
              <input
                id="nc-title"
                className="field-input field-input--title"
                type="text"
                placeholder="e.g. Thermodynamics — Laws & Systems"
                value={doc.title}
                onChange={(e) => setDoc({ ...doc, title: e.target.value })}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="nc-intro">
                Introduction
              </label>
              <textarea
                id="nc-intro"
                className="field-input field-input--area"
                rows={4}
                placeholder="A short paragraph introducing the note..."
                value={doc.introduction}
                onChange={(e) =>
                  setDoc({ ...doc, introduction: e.target.value })
                }
              />
              <MediaFields
                idPrefix="intro"
                value={doc}
                onChange={(media) => setDoc({ ...doc, ...media })}
              />
            </div>

            <SectionEditor
              sections={doc.sections}
              onChange={(sections) => setDoc({ ...doc, sections })}
            />
          </div>
        </section>

        <section className="pane pane--preview" aria-label="Preview">
          <div className="pane__scroll">
            <NotePreview doc={doc} />
          </div>
        </section>
      </main>

      <footer className="nc-statusbar">
        Last updated {new Date(doc.lastUpdated).toLocaleString()}
        {publishStatus === "published" && " · Published to Drive ✓"}
        {publishStatus === "publishing" && " · Publishing to Drive…"}
        {publishStatus === "error" && " · Couldn't publish — try again"}
      </footer>

      {modal === "new" && (
        <NewNoteModal
          onClose={() => setModal(null)}
          onCreate={handleCreateNote}
        />
      )}
      {modal === "notes" && (
        <NotesModal onClose={() => setModal(null)} onPick={handlePickNote} />
      )}
      {modal === "save" && (
        <SaveModal
          onClose={() => setModal(null)}
          onSave={handleSave}
          initial={{ course: doc.course, level: doc.level }}
          fileName={doc.fileName}
        />
      )}
      {resumePrompt && (
        <ResumeDraftModal
          fileName={resumePrompt}
          onContinue={handleResumeContinue}
          onDiscard={handleResumeDiscard}
        />
      )}
    </div>
  );
}
