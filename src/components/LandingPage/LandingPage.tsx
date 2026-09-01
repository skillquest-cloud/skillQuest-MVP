import { useState } from "react";
import type { FormEvent } from "react";
import "./LandingPage.css";

/**
 * SkillQuest — landing page
 * No login, no nav. Headline + search + CTA, with a hero graphic built
 * from the product's own metaphor: browsable course folders.
 */

const FOLDER_PREVIEW = [
  { code: "LAW 201", tone: "amber" },
  { code: "MTH 304", tone: "periwinkle" },
  { code: "PHY 102", tone: "amber" },
  { code: "MED 501", tone: "periwinkle" },
];

type LandingPageProps = {
  onExplore?: (query: string) => void;
};

export default function LandingPage({ onExplore }: LandingPageProps) {
  const [query, setQuery] = useState("");

  function handleExplore(e: FormEvent) {
    e.preventDefault();
    onExplore?.(query);
  }

  return (
    <main className="sq-landing">
      <div className="sq-landing__inner">
        <section className="sq-hero">
          <p className="sq-wordmark">SkillQuest</p>

          <h1 className="sq-headline">
            Your course notes,
            <br />
            already sorted.
          </h1>

          <p className="sq-subhead">
            Every course, arranged by level and subject — the way you'd actually
            look for it. No sign-up, no clutter, just open a folder and start
            reading.
          </p>

          <form className="sq-search" onSubmit={handleExplore}>
            <label className="sq-search__label" htmlFor="sq-search-input">
              Search for a course
            </label>
            <div className="sq-search__row">
              <input
                id="sq-search-input"
                type="text"
                className="sq-search__input"
                placeholder="Try “Law 200” or “Anatomy”"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="sq-search__button">
                View courses
              </button>
            </div>
          </form>
        </section>

        <section className="sq-visual" aria-hidden="true">
          <div className="sq-stack">
            {FOLDER_PREVIEW.map((item, i) => (
              <div
                key={item.code}
                className={`sq-folder sq-folder--${item.tone}`}
                style={{ ["--i" as string]: i }}
              >
                <span className="sq-folder__tab" />
                <span className="sq-folder__code">{item.code}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
