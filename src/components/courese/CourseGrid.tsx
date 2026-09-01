import { useEffect, useRef, useState } from "react";
import ErrorState from "../ErrorState/ErrorState";
import "./CourseGrid.css";

/**
 * SkillQuest — course grid
 * Reached from the landing page's "View courses" / search action.
 * Windows-Explorer-style folders: icon on top, name underneath.
 * Clicking a course goes to that course's level grid (100lvl–500lvl).
 */

type Course = {
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

function CourseCard({
  course,
  index,
  onSelect,
}: {
  course: Course;
  index: number;
  onSelect?: (id: string) => void;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLButtonElement>();
  const tone = index % 2 === 0 ? "amber" : "periwinkle";

  function handleOpen() {
    onSelect?.(course.id);
  }

  return (
    <button
      ref={ref}
      type="button"
      className={`cg-card${visible ? " cg-card--visible" : ""}`}
      style={{ ["--i" as string]: index % 8 }}
      onClick={handleOpen}
    >
      <span className={`cg-folder cg-folder--${tone}`} aria-hidden="true">
        <span className="cg-folder__tab" />
      </span>
      <span className="cg-card__name">{course.name}</span>
    </button>
  );
}

function CourseSkeletonGrid() {
  return (
    <div className="cg-grid" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="cg-skeleton" key={i}>
          <div className="cg-skeleton__folder" />
          <div className="cg-skeleton__label" />
        </div>
      ))}
    </div>
  );
}

type CourseGridProps = {
  courses: Course[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  onSelectCourse?: (id: string) => void;
};

export default function CourseGrid({
  courses,
  loading,
  error,
  onRetry,
  onBack,
  onSelectCourse,
}: CourseGridProps) {
  function handleBack() {
    onBack?.();
  }

  return (
    <main className="cg-page">
      <button
        type="button"
        className="cg-back"
        onClick={handleBack}
        aria-label="Back to landing page"
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

      <h1 className="cg-heading">Courses</h1>

      {error ? (
        <ErrorState
          message="Couldn't load your courses. Check your connection and try again."
          onRetry={onRetry}
        />
      ) : loading ? (
        <CourseSkeletonGrid />
      ) : courses.length === 0 ? (
        <p className="cg-empty">No courses uploaded yet.</p>
      ) : (
        <div className="cg-grid">
          {courses.map((course, i) => (
            <CourseCard
              course={course}
              index={i}
              key={course.id}
              onSelect={onSelectCourse}
            />
          ))}
        </div>
      )}
    </main>
  );
}
