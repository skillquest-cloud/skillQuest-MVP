import { useEffect, useRef, useState } from "react";
import ErrorState from "../ErrorState/ErrorState";
import "./LevelGrid.css";

/**
 * SkillQuest — level grid
 * Reached after picking a course. Shows 100lvl–500lvl as folders.
 * Clicking a level goes to that level's subject grid.
 */

type Level = {
  id: string;
  name: string;
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

function LevelCard({
  level,
  index,
  onSelect,
}: {
  level: Level;
  index: number;
  onSelect?: (level: Level) => void;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLButtonElement>();

  return (
    <button
      ref={ref}
      type="button"
      className={`lg-card${visible ? " lg-card--visible" : ""}`}
      style={{ ["--i" as string]: index }}
      onClick={() => onSelect?.(level)}
    >
      <span className="lg-folder" aria-hidden="true">
        <span className="lg-folder__tab" />
      </span>
      <span className="lg-card__name">{level.name}</span>
    </button>
  );
}

function LevelSkeletonGrid() {
  return (
    <div className="lg-grid" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="lg-skeleton" key={i}>
          <div className="lg-skeleton__folder" />
          <div className="lg-skeleton__label" />
        </div>
      ))}
    </div>
  );
}

type LevelGridProps = {
  courseName: string;
  levels: Level[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  onSelectLevel?: (level: Level) => void;
};

export default function LevelGrid({
  courseName,
  levels,
  loading,
  error,
  onRetry,
  onBack,
  onSelectLevel,
}: LevelGridProps) {
  return (
    <main className="lg-page">
      <button
        type="button"
        className="lg-back"
        onClick={() => onBack?.()}
        aria-label="Back to courses"
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

      <h1 className="lg-heading">{courseName}</h1>
      <p className="lg-subheading">Pick a level</p>

      {error ? (
        <ErrorState
          message="Couldn't load levels for this course. Check your connection and try again."
          onRetry={onRetry}
        />
      ) : loading ? (
        <LevelSkeletonGrid />
      ) : levels.length === 0 ? (
        <p className="lg-empty">No levels uploaded for this course yet.</p>
      ) : (
        <div className="lg-grid">
          {levels.map((level, i) => (
            <LevelCard
              level={level}
              index={i}
              key={level.id}
              onSelect={onSelectLevel}
            />
          ))}
        </div>
      )}
    </main>
  );
}
