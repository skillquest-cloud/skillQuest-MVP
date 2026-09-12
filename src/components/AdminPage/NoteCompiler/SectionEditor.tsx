import { useState } from "react";
import type { NoteSection, NoteSubsection } from "./types";
import { makeId } from "./types";
import { MediaFields } from "./MediaFields";

interface SectionEditorProps {
  sections: NoteSection[];
  onChange: (sections: NoteSection[]) => void;
}

function blankSection(): NoteSection {
  return { id: makeId("section"), title: "", body: "", subsections: [] };
}

function blankSubsection(): NoteSubsection {
  return { id: makeId("sub"), title: "", body: "" };
}

export function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateAt(index: number, patch: Partial<NoteSection>) {
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeAt(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addAtTop() {
    onChange([blankSection(), ...sections]);
  }

  function addAtBottom() {
    onChange([...sections, blankSection()]);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...sections];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
  }

  return (
    <div className="sections-block">
      <div className="sections-header">
        <span className="field-label">Sections</span>
        <div className="sections-header__actions">
          <button type="button" className="btn btn--small" onClick={addAtTop}>
            + Add to top
          </button>
          <button type="button" className="btn btn--small" onClick={addAtBottom}>
            + Add section
          </button>
        </div>
      </div>

      {sections.length === 0 && (
        <p className="empty-hint">No sections yet — add one above to get started.</p>
      )}

      <div className="sections-list">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`section-card${dragIndex === index ? " section-card--dragging" : ""}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => setDragIndex(null)}
          >
            <div className="section-card__head">
              <span className="drag-handle" title="Drag to reorder">⠿</span>
              <span className="section-card__index">Section {index + 1}</span>
              <div className="section-card__move">
                <button
                  type="button"
                  className="icon-btn"
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Move down"
                  disabled={index === sections.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                className="icon-btn icon-btn--danger remove-section"
                title="Remove section"
                onClick={() => removeAt(index)}
              >
                ✕
              </button>
            </div>

            <label className="field-label field-label--sm">Section title</label>
            <input
              className="field-input"
              type="text"
              placeholder="e.g. Meaning and Importance of Statistics"
              value={section.title}
              onChange={(e) => updateAt(index, { title: e.target.value })}
            />

            <label className="field-label field-label--sm">Body</label>
            <textarea
              className="field-input field-input--area"
              rows={6}
              placeholder="Section body text..."
              value={section.body}
              onChange={(e) => updateAt(index, { body: e.target.value })}
            />

            <MediaFields
              idPrefix={section.id}
              value={section}
              onChange={(media) => updateAt(index, media)}
            />

            <SubsectionEditor
              subsections={section.subsections}
              onChange={(subsections) => updateAt(index, { subsections })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SubsectionEditor({
  subsections,
  onChange,
}: {
  subsections: NoteSubsection[];
  onChange: (subsections: NoteSubsection[]) => void;
}) {
  function updateAt(index: number, patch: Partial<NoteSubsection>) {
    onChange(subsections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeAt(index: number) {
    onChange(subsections.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= subsections.length) return;
    const next = [...subsections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="subsections-block">
      <div className="subsections-header">
        <span className="field-label field-label--sm">
          Subsections <span className="optional">(optional)</span>
        </span>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => onChange([...subsections, blankSubsection()])}
        >
          + Add subsection
        </button>
      </div>

      <div className="subsections-list">
        {subsections.map((sub, index) => (
          <div key={sub.id} className="subsection-card">
            <div className="subsection-card__head">
              <span className="subsection-card__index">Subsection {index + 1}</span>
              <div className="section-card__move">
                <button
                  type="button"
                  className="icon-btn"
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Move down"
                  disabled={index === subsections.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                className="icon-btn icon-btn--danger remove-subsection"
                title="Remove subsection"
                onClick={() => removeAt(index)}
              >
                ✕
              </button>
            </div>

            <label className="field-label field-label--sm">Subsection title</label>
            <input
              className="field-input"
              type="text"
              placeholder="e.g. Mean"
              value={sub.title}
              onChange={(e) => updateAt(index, { title: e.target.value })}
            />

            <label className="field-label field-label--sm">Body</label>
            <textarea
              className="field-input field-input--area"
              rows={5}
              placeholder="Subsection body text..."
              value={sub.body}
              onChange={(e) => updateAt(index, { body: e.target.value })}
            />

            <MediaFields
              idPrefix={sub.id}
              value={sub}
              onChange={(media) => updateAt(index, media)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
