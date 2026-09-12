import type { NoteBlockMedia, NoteDoc } from "./types";

interface NotePreviewProps {
  doc: NoteDoc;
}

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

function Paragraphs({ text, className }: { text: string; className: string }) {
  const chunks = (text || "")
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);
  return (
    <>
      {chunks.map((chunk, i) => (
        <p key={i} className={className}>
          {chunk}
        </p>
      ))}
    </>
  );
}

function MediaBlock({ media, title }: { media: NoteBlockMedia; title: string }) {
  const videoId = extractYouTubeId(media.video);
  return (
    <>
      {media.image?.url && (
        <img className="reader__image" src={media.image.url} alt={media.image.alt || title} />
      )}
      {media.svg && (
        <div className="reader__svg" dangerouslySetInnerHTML={{ __html: media.svg }} />
      )}
      {media.video && videoId && (
        <div className="reader__video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={title || "Embedded video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {media.video && !videoId && (
        <p className="reader__video-broken">Couldn't read a YouTube ID from "{media.video}"</p>
      )}
    </>
  );
}

export function NotePreview({ doc }: NotePreviewProps) {
  const namedSections = doc.sections.filter((s) => s.title.trim());

  return (
    <article className="reader">
      <h1 className="reader__title">{doc.title.trim() || "Untitled note"}</h1>
      {doc.introduction.trim() && <p className="reader__intro">{doc.introduction}</p>}
      <MediaBlock media={doc} title={doc.title} />

      {namedSections.length > 0 && (
        <nav className="reader__toc" aria-label="Table of contents">
          <p className="reader__toc-label">In this note</p>
          <ol className="reader__toc-list">
            {namedSections.map((s) => (
              <li key={s.id}>{s.title}</li>
            ))}
          </ol>
        </nav>
      )}

      <div className="reader__sections">
        {doc.sections.length === 0 && (
          <p className="reader__empty">Add a section on the left to see it rendered here.</p>
        )}
        {doc.sections.map((section) => (
          <div key={section.id} className="reader__section">
            {section.title.trim() && <h2 className="reader__section-title">{section.title}</h2>}
            {section.body.trim() && (
              <Paragraphs text={section.body} className="reader__section-note" />
            )}
            <MediaBlock media={section} title={section.title} />

            {section.subsections.map((sub) => (
              <div key={sub.id} className="reader__subsection">
                {sub.title.trim() && <h3 className="reader__subsection-title">{sub.title}</h3>}
                {sub.body.trim() && (
                  <Paragraphs text={sub.body} className="reader__section-note" />
                )}
                <MediaBlock media={sub} title={sub.title} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}
