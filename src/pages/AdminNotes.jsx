import { useEffect, useState } from "react";
import { api } from "../api";
import { NoteItems, resolvedNote } from "../components/SessionCard";

export default function AdminNotes() {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const rows = await api("/admin/admin_notes");
    setNotes(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const unresolved = notes.filter((note) => !resolvedNote(note));
  const resolved = notes.filter((note) => resolvedNote(note));

  return (
    <section>
      <header className="page-head">
        <h1>Admin notes</h1>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading admin notes…</p> : null}
      <section className="panel">
        <h2>Unresolved</h2>
        <NoteItems notes={unresolved} onChange={load} />
      </section>
      <section className="panel">
        <h2>Resolved</h2>
        <NoteItems notes={resolved} onChange={load} />
      </section>
    </section>
  );
}
