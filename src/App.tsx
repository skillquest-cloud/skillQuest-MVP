import { useState, useEffect, useCallback } from "react";
import LandingPage from "./components/LandingPage/LandingPage";
import CourseGrid from "./components/courese/CourseGrid";
import LevelGrid from "./components/LevelGrid/LevelGrid";
import SubjectGrid from "./components/SubjestGrid/SubjectGrid";
import NoteReader, { type NoteData } from "./components/NoteReader/NoteReader";
import SearchResults from "./components/SearchResults/SearchResults";
import AdminPage from "./components/AdminPage/AdminPage";
import "./App.css";

type View = "landing" | "courses" | "levels" | "subjects" | "note" | "search";

type DriveItem = { id: string; name: string };

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

/** Fire-and-forget click tracking — never blocks navigation on failure. */
function trackClick(label: string) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  }).catch((err) => console.error("Failed to record click:", err));
}

/** Anonymous id stored in localStorage — no login, distinguishes returning
 *  visitors from new ones without collecting any personal data. */
function getVisitorId(): string {
  const key = "sq_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function trackVisit() {
  fetch("/api/track-visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId: getVisitorId() }),
  }).catch((err) => console.error("Failed to record visit:", err));
}

function MainFlow() {
  const [view, setView] = useState<View>("landing");

  const [courses, setCourses] = useState<DriveItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState(false);

  const [levels, setLevels] = useState<DriveItem[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [levelsError, setLevelsError] = useState(false);

  const [subjects, setSubjects] = useState<DriveItem[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState(false);

  const [note, setNote] = useState<NoteData | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<DriveItem | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<DriveItem | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );

  const loadCourses = useCallback(() => {
    setCoursesLoading(true);
    setCoursesError(false);
    fetch("/api/courses")
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((data) => setCourses(data.courses ?? []))
      .catch((err) => {
        console.error("Failed to load courses:", err);
        setCoursesError(true);
      })
      .finally(() => setCoursesLoading(false));
  }, []);

  const loadLevels = useCallback((courseId: string) => {
    setLevelsLoading(true);
    setLevelsError(false);
    fetch(`/api/levels?courseId=${encodeURIComponent(courseId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((data) => setLevels(data.levels ?? []))
      .catch((err) => {
        console.error("Failed to load levels:", err);
        setLevelsError(true);
      })
      .finally(() => setLevelsLoading(false));
  }, []);

  const loadSubjects = useCallback((levelId: string, levelName: string) => {
    setSubjectsLoading(true);
    setSubjectsError(false);
    fetch(
      `/api/subjects?levelId=${encodeURIComponent(
        levelId,
      )}&levelName=${encodeURIComponent(levelName)}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((data) => setSubjects(data.subjects ?? []))
      .catch((err) => {
        console.error("Failed to load subjects:", err);
        setSubjectsError(true);
      })
      .finally(() => setSubjectsLoading(false));
  }, []);

  const loadNote = useCallback((subjectId: string) => {
    setNoteLoading(true);
    setNoteError(false);
    setNote(null);
    fetch(`/api/note?fileId=${encodeURIComponent(subjectId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((data) => setNote(data))
      .catch((err) => {
        console.error("Failed to load note:", err);
        setNoteError(true);
      })
      .finally(() => setNoteLoading(false));
  }, []);

  function openSubject(subjectId: string, course: DriveItem, level: DriveItem) {
    setSelectedCourse(course);
    setSelectedLevel(level);
    setSelectedSubjectId(subjectId);
    setView("note");
    loadNote(subjectId);
    trackClick(`${course.name} · ${level.name}`);
  }

  const runSearch = useCallback((query: string) => {
    setSearchLoading(true);
    setSearchError(false);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((data: { results: SearchEntry[] }) => {
        const results = data.results ?? [];
        setSearchResults(results);

        // Exactly one match: jump straight there instead of showing a list.
        if (results.length === 1) {
          const only = results[0];
          if (only.type === "course") {
            setSelectedCourse({ id: only.courseId, name: only.courseName });
            setView("levels");
          } else {
            openSubject(
              only.subjectId,
              { id: only.courseId, name: only.courseName },
              { id: only.levelId, name: only.levelName },
            );
          }
        } else {
          setView("search");
        }
      })
      .catch((err) => {
        console.error("Search failed:", err);
        setSearchError(true);
        setView("search");
      })
      .finally(() => setSearchLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackVisit();
  }, []);

  useEffect(() => {
    if (view === "courses") loadCourses();
  }, [view, loadCourses]);

  useEffect(() => {
    if (view === "levels" && selectedCourse) loadLevels(selectedCourse.id);
  }, [view, selectedCourse, loadLevels]);

  useEffect(() => {
    if (view === "subjects" && selectedLevel)
      loadSubjects(selectedLevel.id, selectedLevel.name);
  }, [view, selectedLevel, loadSubjects]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <>
      {view === "landing" && (
        <LandingPage
          onExplore={(query) => {
            const trimmed = query.trim();
            if (!trimmed) {
              setView("courses");
              return;
            }
            setSearchQuery(trimmed);
            runSearch(trimmed);
          }}
        />
      )}

      {view === "search" && (
        <SearchResults
          query={searchQuery}
          results={searchResults}
          loading={searchLoading}
          error={searchError}
          onRetry={() => runSearch(searchQuery)}
          onBack={() => setView("landing")}
          onSelectCourse={(courseId, courseName) => {
            setSelectedCourse({ id: courseId, name: courseName });
            setView("levels");
          }}
          onSelectSubject={(entry) =>
            openSubject(
              entry.subjectId,
              { id: entry.courseId, name: entry.courseName },
              { id: entry.levelId, name: entry.levelName },
            )
          }
        />
      )}

      {view === "courses" && (
        <CourseGrid
          courses={courses}
          loading={coursesLoading}
          error={coursesError}
          onRetry={loadCourses}
          onBack={() => setView("landing")}
          onSelectCourse={(id) => {
            const course = courses.find((c) => c.id === id) ?? null;
            setSelectedCourse(course);
            setView("levels");
          }}
        />
      )}

      {view === "levels" && selectedCourse && (
        <LevelGrid
          courseName={selectedCourse.name}
          levels={levels}
          loading={levelsLoading}
          error={levelsError}
          onRetry={() => loadLevels(selectedCourse.id)}
          onBack={() => setView("courses")}
          onSelectLevel={(level) => {
            setSelectedLevel(level);
            setView("subjects");
          }}
        />
      )}

      {view === "subjects" && selectedCourse && selectedLevel && (
        <SubjectGrid
          courseName={selectedCourse.name}
          level={selectedLevel.name}
          subjects={subjects}
          loading={subjectsLoading}
          error={subjectsError}
          onRetry={() => loadSubjects(selectedLevel.id, selectedLevel.name)}
          onBack={() => setView("levels")}
          onSelectSubject={(subjectId) =>
            openSubject(subjectId, selectedCourse, selectedLevel)
          }
        />
      )}

      {view === "note" && (
        <NoteReader
          note={note}
          loading={noteLoading}
          error={noteError}
          onRetry={() => selectedSubjectId && loadNote(selectedSubjectId)}
          onBack={() => setView("subjects")}
        />
      )}
    </>
  );
}

function App() {
  // Hidden admin route — not linked anywhere in the UI, reached only by
  // visiting /skillquest_admin directly.
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname === "/skillquest_admin";

  return isAdminRoute ? <AdminPage /> : <MainFlow />;
}

export default App;
