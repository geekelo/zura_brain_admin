import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDate } from "../format";
import { SessionLink } from "../components/RecordLink";

export default function Comments() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const sessions = await api("/admin/sessions");
    const comments = [];
    sessions.forEach((session) => {
      const entries = Array.isArray(session.comments) ? session.comments : [];
      entries.forEach((entry, index) => {
        comments.push({
          ...entry,
          index,
          session_code: session.session_code,
          client_name: session.client?.name
        });
      });
    });
    setRows(comments);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  async function resolve(row) {
    const key = `${row.session_code}-${row.index}`;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await api(`/admin/sessions/${row.session_code}/comments/resolve`, {
        method: "PATCH",
        body: { index: row.index, resolved: true }
      });
      setNotice("Comment resolved.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  const unresolved = rows.filter((row) => !row.resolved);
  const resolved = rows.filter((row) => row.resolved);

  return (
    <section>
      <header className="page-head">
        <h1>Comments</h1>
        <p>Open a session number to update that session.</p>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {loading ? <p className="muted">Loading comments…</p> : null}
      <CommentGroup title="Unresolved" rows={unresolved} busy={busy} onResolve={resolve} />
      <CommentGroup title="Resolved" rows={resolved} busy={busy} onResolve={null} />
    </section>
  );
}

function CommentGroup({ title, rows, busy, onResolve }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {rows.length ? (
        <ul className="comments">
          {rows.map((row) => (
            <li key={`${row.session_code}-${row.index}`}>
              <SessionLink code={row.session_code} />
              <strong>{row.name || row.client_name || "Note"}</strong>
              <span>{formatDate(row.date_time)}</span>
              <span className="sub">{row.comment}</span>
              {onResolve ? (
                <button
                  type="button"
                  className="ghost"
                  disabled={busy === `${row.session_code}-${row.index}`}
                  onClick={() => onResolve(row)}
                >
                  Resolve
                </button>
              ) : <span className="pill">Resolved</span>}
            </li>
          ))}
        </ul>
      ) : <p className="muted">No {title.toLowerCase()} comments.</p>}
    </section>
  );
}
