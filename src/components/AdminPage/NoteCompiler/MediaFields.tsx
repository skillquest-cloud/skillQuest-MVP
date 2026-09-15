import { useRef, useState } from "react";
import type { NoteBlockMedia } from "./types";
import { uploadImage } from "./noteCompilerApi";

interface MediaFieldsProps {
  value: NoteBlockMedia;
  onChange: (next: NoteBlockMedia) => void;
  idPrefix: string;
}

/**
 * Video / image / SVG controls for one block (intro, a section, or a
 * subsection). Collapsed into a single row of toggles by default so the
 * editor doesn't feel cluttered when a block has no media.
 */
export function MediaFields({ value, onChange, idPrefix }: MediaFieldsProps) {
  const [open, setOpen] = useState<"video" | "image" | "svg" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const hasVideo = Boolean(value.video);
  const hasImage = Boolean(value.image?.url);
  const hasSvg = Boolean(value.svg);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await uploadImage(file);
      onChange({ ...value, image: { url, alt: value.image?.alt ?? "" } });
      setOpen("image");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't upload that image.";
      setUploadError(`${message} You can also paste a URL below instead.`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="media-fields">
      <div className="media-fields__toggles">
        <button
          type="button"
          className={`media-toggle${hasVideo ? " media-toggle--active" : ""}`}
          onClick={() => setOpen(open === "video" ? null : "video")}
        >
          ▶ Video{hasVideo ? " · added" : ""}
        </button>
        <button
          type="button"
          className={`media-toggle${hasImage ? " media-toggle--active" : ""}`}
          onClick={() => setOpen(open === "image" ? null : "image")}
        >
          ▤ Image{hasImage ? " · added" : ""}
        </button>
        <button
          type="button"
          className={`media-toggle${hasSvg ? " media-toggle--active" : ""}`}
          onClick={() => setOpen(open === "svg" ? null : "svg")}
        >
          ⌗ SVG{hasSvg ? " · added" : ""}
        </button>
      </div>

      {open === "video" && (
        <div className="media-panel">
          <label
            className="field-label field-label--sm"
            htmlFor={`${idPrefix}-video`}
          >
            YouTube URL
          </label>
          <div className="media-panel__row">
            <input
              id={`${idPrefix}-video`}
              className="field-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={value.video ?? ""}
              onChange={(e) => onChange({ ...value, video: e.target.value })}
            />
            {hasVideo && (
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                title="Remove video"
                onClick={() => onChange({ ...value, video: undefined })}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {open === "image" && (
        <div className="media-panel">
          <label className="field-label field-label--sm">Image</label>
          <div className="media-panel__row">
            <input
              className="field-input"
              type="text"
              placeholder="Paste an image URL, or upload a file"
              value={value.image?.url ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  image: { url: e.target.value, alt: value.image?.alt ?? "" },
                })
              }
            />
            <button
              type="button"
              className="btn btn--small"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            {hasImage && (
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                title="Remove image"
                onClick={() => onChange({ ...value, image: undefined })}
              >
                ✕
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {uploadError && <p className="media-panel__error">{uploadError}</p>}
          {hasImage && (
            <>
              <label
                className="field-label field-label--sm"
                style={{ marginTop: 8 }}
              >
                Alt text
              </label>
              <input
                className="field-input"
                type="text"
                placeholder="Describe the image for screen readers"
                value={value.image?.alt ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    image: { url: value.image!.url, alt: e.target.value },
                  })
                }
              />
              <img
                src={value.image?.url}
                alt=""
                className="media-panel__preview"
              />
            </>
          )}
        </div>
      )}

      {open === "svg" && (
        <div className="media-panel">
          <label
            className="field-label field-label--sm"
            htmlFor={`${idPrefix}-svg`}
          >
            SVG markup
          </label>
          <textarea
            id={`${idPrefix}-svg`}
            className="field-input field-input--area"
            rows={4}
            placeholder="<svg ...>...</svg>"
            value={value.svg ?? ""}
            onChange={(e) => onChange({ ...value, svg: e.target.value })}
          />
          {hasSvg && (
            <div
              className="media-panel__preview media-panel__preview--svg"
              dangerouslySetInnerHTML={{ __html: value.svg ?? "" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
