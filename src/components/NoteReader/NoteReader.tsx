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
 *       "youtubeId": "dQw4w9WgXcQ"
 *     }
 *   ]
 * }
 */

type NoteSection = {
  id: string;
  title: string;
  body: string;
  youtubeId?: string;
};

export type NoteData = {
  title: string;
  introduction: string;
  sections: NoteSection[];
};

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
                <p className="nr-section__body">{section.body}</p>

                {section.youtubeId && (
                  <div className="nr-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${section.youtubeId}`}
                      title={section.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </section>
            ))}
          </article>
        </div>
      )}
    </main>
  );
}
