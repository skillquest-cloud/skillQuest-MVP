import { useEffect, useRef, useState } from "react";
import ErrorState from "../ErrorState/ErrorState";
import "./SubjectGrid.css";

/**
 * SkillQuest — subject grid
 * Reached after picking a level. Shows subjects for that course+level.
 * Clicking a subject opens the note reader.
 */

type Subject = {
  id: string;
  name: string;
};

type SubjectGridProps = {
  courseName: string;
  level: string;
  subjects: Subject[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  onSelectSubject?: (subjectId: string) => void;
};

function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function SubjectCard({
  subject,
  index,
  onSelect,
}: {
  subject: Subject;
  index: number;
  onSelect?: (id: string) => void;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLButtonElement>();

  return (
    <button
      ref={ref}
      type="button"
      className={`sg-card${visible ? " sg-card--visible" : ""}`}
      style={{ ["--i" as string]: index % 8 }}
      onClick={() => onSelect?.(subject.id)}
    >
      <span className="sg-folder" aria-hidden="true">
        <span className="sg-folder__tab" />
      </span>
      <span className="sg-card__name">{subject.name}</span>
    </button>
  );
}

function SubjectSkeletonGrid() {
  return (
    <div className="sg-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="sg-skeleton" key={i}>
          <div className="sg-skeleton__folder" />
          <div className="sg-skeleton__label" />
        </div>
      ))}
    </div>
  );
}

export default function SubjectGrid({
  courseName,
  level,
  subjects,
  loading,
  error,
  onRetry,
  onBack,
  onSelectSubject,
}: SubjectGridProps) {
  return (
    <main className="sg-page">
      <button
        type="button"
        className="sg-back"
        onClick={() => onBack?.()}
        aria-label="Back to levels"
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

      <h1 className="sg-heading">
        {courseName} · {level}
      </h1>
      <p className="sg-subheading">Pick a subject</p>

      {error ? (
        <ErrorState
          message="Couldn't load subjects for this level. Check your connection and try again."
          onRetry={onRetry}
        />
      ) : loading ? (
        <SubjectSkeletonGrid />
      ) : subjects.length === 0 ? (
        <p className="sg-empty">No subjects uploaded for this level yet.</p>
      ) : (
        <div className="sg-grid">
          {subjects.map((subject, i) => (
            <SubjectCard
              subject={subject}
              index={i}
              key={subject.id}
              onSelect={onSelectSubject}
            />
          ))}
        </div>
      )}
    </main>
  );
}
