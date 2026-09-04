import { useEffect, useRef, useState } from "react";
import ErrorState from "../ErrorState/ErrorState";
import "./NoteReader.css";

/**
 * SkillQuest — note reader
 * Reached after picking a subject. Renders a note from its JSON —
 * title, table of contents, introduction, and sections (each with a
 * subtitle, body text, and an optional YouTube video).
 *
 * Expected JSON shape (see NoteData type below):
 * {
 *   "title": "Contract Law Basics",
 *   "introduction": "An overview of...",
 *   "sections": [
 *     {
 *       "id": "offer-acceptance",
 *       "title": "Offer & Acceptance",
 *       "body": "A contract begins when...",
 *       "images": [
 *         { "svg": "<svg ...>...</svg>", "caption": "Fig 1: Offer flow" },
 *         { "url": "https://...", "caption": "Fig 2: Scanned question" }
 *       ],
 *       "youtubeId": "dQw4w9WgXcQ",
 *       "subsections": [
 *         { "title": "Express Offers", "body": "..." },
 *         { "title": "Implied Offers", "body": "..." }
 *       ]
 *     }
 *   ]
 * }
 * subsections are smaller subtitled chunks inside a section — they don't
 * get their own table-of-contents entry, unlike top-level sections.
 */

type NoteImage = {
  /** For photos/screenshots/scanned question drawings — a plain URL. */
  url?: string;
  /** For diagrams — raw SVG markup that inherits the page's colors and
   *  sits flush against the background instead of looking pasted in.
   *  Provide either `url` or `svg`, not both. */
  svg?: string;
  caption?: string;
};

/** A smaller subtitled chunk living inside a section — e.g. "Express
 *  Contracts" and "Implied Contracts" both inside a "Types of Contracts"
 *  section. Doesn't get its own table-of-contents entry. */
type NoteSubsection = {
  title: string;
  body: string;
  images?: NoteImage[];
  youtubeId?: string;
};

type NoteSection = {
  id: string;
  title: string;
  body: string;
  images?: NoteImage[];
  youtubeId?: string;
  subsections?: NoteSubsection[];
};

export type NoteData = {
  title: string;
  introduction: string;
  sections: NoteSection[];
};

function NoteImages({
  images,
  altFallback,
}: {
  images?: NoteImage[];
  altFallback: string;
}) {
  if (!images || images.length === 0) return null;
  return (
    <div className="nr-images">
      {images.map((image, i) =>
        image.svg ? (
          <figure className="nr-figure nr-figure--svg" key={i}>
            <div
              className="nr-figure__svg"
              role="img"
              aria-label={image.caption ?? altFallback}
              dangerouslySetInnerHTML={{ __html: image.svg }}
            />
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        ) : (
          <figure className="nr-figure" key={i}>
            <img
              src={image.url}
              alt={image.caption ?? altFallback}
              loading="lazy"
            />
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        ),
      )}
    </div>
  );
}

function NoteVideo({
  youtubeId,
  title,
}: {
  youtubeId?: string;
  title: string;
}) {
  if (!youtubeId) return null;
  return (
    <div className="nr-video">
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/**
 * Renders body text as real paragraphs and lists, not just plain text
 * with line breaks. A blank line (\n\n) separates blocks. Within a
 * block, if EVERY line starts with "- " it becomes a bullet list; if
 * every line starts with "1. " (any numbers) it becomes a numbered
 * list; otherwise it's a plain paragraph with single line breaks kept.
 */
function NoteBody({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter((b) => b.trim() !== "");

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");

        const isBulleted =
          lines.length > 0 && lines.every((l) => /^-\s+/.test(l.trim()));
        const isNumbered =
          lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l.trim()));

        if (isBulleted) {
          return (
            <ul className="nr-list" key={i}>
              {lines.map((l, j) => (
                <li key={j}>{l.trim().replace(/^-\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        if (isNumbered) {
          return (
            <ol className="nr-list" key={i}>
              {lines.map((l, j) => (
                <li key={j}>{l.trim().replace(/^\d+\.\s+/, "")}</li>
              ))}
            </ol>
          );
        }

        return (
          <p className="nr-section__body" key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {l}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

type NoteReaderProps = {
  note: NoteData | null;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
};

function NoteSkeleton() {
  return (
    <div className="nr-skeleton" aria-hidden="true">
      <div className="nr-skeleton__title" />
      <div className="nr-skeleton__line" />
      <div className="nr-skeleton__line" style={{ width: "80%" }} />
      <div className="nr-skeleton__line" style={{ width: "60%" }} />
      <div className="nr-skeleton__block" />
    </div>
  );
}

export default function NoteReader({
  note,
  loading,
  error,
  onRetry,
  onBack,
}: NoteReaderProps) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!note) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveSectionId(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [note]);

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="nr-page">
      <button
        type="button"
        className="nr-back"
        onClick={() => onBack?.()}
        aria-label="Back to subjects"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M15 5 8 12l7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </button>

      {error ? (
        <ErrorState
          message="Couldn't load this note. Check your connection and try again."
          onRetry={onRetry}
        />
      ) : loading || !note ? (
        <NoteSkeleton />
      ) : (
        <div className="nr-layout">
          <nav className="nr-toc" aria-label="Table of contents">
            <p className="nr-toc__label">Contents</p>
            <ul>
              {note.sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className={`nr-toc__link${
                      activeSectionId === section.id
                        ? " nr-toc__link--active"
                        : ""
                    }`}
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <article className="nr-content">
            <h1 className="nr-title">{note.title}</h1>
            <p className="nr-intro">{note.introduction}</p>

            {note.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="nr-section"
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
              >
                <h2 className="nr-section__title">{section.title}</h2>
                <NoteBody text={section.body} />

                <NoteImages
                  images={section.images}
                  altFallback={section.title}
                />
                <NoteVideo
                  youtubeId={section.youtubeId}
                  title={section.title}
                />

                {section.subsections?.map((sub, i) => (
                  <div className="nr-subsection" key={i}>
                    <h3 className="nr-subsection__title">{sub.title}</h3>
                    <NoteBody text={sub.body} />
                    <NoteImages images={sub.images} altFallback={sub.title} />
                    <NoteVideo youtubeId={sub.youtubeId} title={sub.title} />
                  </div>
                ))}
              </section>
            ))}
          </article>
        </div>
      )}
    </main>
  );
}
