interface AdminTabsProps {
  active: "analytics" | "notes";
}

/** Plain <a> links, not client-side routing — this app has none. Clicking
 *  navigates for real (full reload), landing back in App.tsx's pathname
 *  check, same as visiting /skillquest_admin directly. */
export default function AdminTabs({ active }: AdminTabsProps) {
  return (
    <nav className="ap-tabs" aria-label="Admin sections">
      <a
        href="/skillquest_admin"
        className={`ap-tab${active === "analytics" ? " ap-tab--active" : ""}`}
        aria-current={active === "analytics" ? "page" : undefined}
      >
        Analytics
      </a>
      <a
        href="/skillquest_admin/notes"
        className={`ap-tab${active === "notes" ? " ap-tab--active" : ""}`}
        aria-current={active === "notes" ? "page" : undefined}
      >
        Note Compiler
      </a>
    </nav>
  );
}
