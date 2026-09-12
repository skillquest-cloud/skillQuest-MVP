import AdminTabs from "./AdminTabs";
import NoteCompiler from "./NoteCompiler/NoteCompiler";
import "./AdminPage.css";

export default function NoteCompilerPage() {
  return (
    <div className="ap-page ap-page--notes">
      <AdminTabs active="notes" />
      <div className="ap-notecompiler-page">
        <NoteCompiler />
      </div>
    </div>
  );
}
