import ErrorState from "../ErrorState/ErrorState";
import "./SearchResults.css";

type SearchEntry =
  | { type: "course"; courseId: string; courseName: string }
  | {
      type: "subject";
      courseId: string;
      courseName: string;
      levelId: string;
      levelName: string;
      subjectId: string;
      subjectName: string;
    };

type SearchResultsProps = {
  query: string;
  results: SearchEntry[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  onSelectCourse?: (courseId: string, courseName: string) => void;
  onSelectSubject?: (entry: Extract<SearchEntry, { type: "subject" }>) => void;
};

function ResultsSkeleton() {
  return (
    <div className="sr-skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="sr-skeleton__row" key={i} />
      ))}
    </div>
  );
}

export default function SearchResults({
  query,
  results,
  loading,
  error,
  onRetry,
  onBack,
  onSelectCourse,
  onSelectSubject,
}: SearchResultsProps) {
  return (
    <main className="sr-page">
      <button
        type="button"
        className="sr-back"
        onClick={() => onBack?.()}
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

      <h1 className="sr-heading">Results for “{query}”</h1>

      {error ? (
        <ErrorState message="Couldn't search right now." onRetry={onRetry} />
      ) : loading ? (
        <ResultsSkeleton />
      ) : results.length === 0 ? (
        <p className="sr-empty">
          No courses or subjects matched “{query}.” Try a different spelling or
          a shorter search.
        </p>
      ) : (
        <ul className="sr-list">
          {results.map((entry) =>
            entry.type === "course" ? (
              <li key={`course-${entry.courseId}`}>
                <button
                  type="button"
                  className="sr-row"
                  onClick={() =>
                    onSelectCourse?.(entry.courseId, entry.courseName)
                  }
                >
                  <span className="sr-row__tag sr-row__tag--course">
                    Course
                  </span>
                  <span className="sr-row__name">{entry.courseName}</span>
                </button>
              </li>
            ) : (
              <li key={`subject-${entry.subjectId}-${entry.courseId}`}>
                <button
                  type="button"
                  className="sr-row"
                  onClick={() => onSelectSubject?.(entry)}
                >
                  <span className="sr-row__tag sr-row__tag--subject">
                    Subject
                  </span>
                  <span className="sr-row__name">{entry.subjectName}</span>
                  <span className="sr-row__meta">
                    {entry.courseName} · {entry.levelName}
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </main>
  );
}
