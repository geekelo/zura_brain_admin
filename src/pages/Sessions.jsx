import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import SessionCard from "../components/SessionCard";

const STATUSES = [
  ["pending", "Pending"],
  ["started", "Started"],
  ["ended", "Ended"],
  ["completed", "Completed"],
  ["disputed", "Disputed"]
];

export default function Sessions() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [sessions, setSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(nextPhone = phone) {
    const query = nextPhone.trim() ? `?phone=${encodeURIComponent(nextPhone.trim())}` : "";
    const [sessionRows, noteRows] = await Promise.all([
      api(`/admin/sessions${query}`),
      api("/admin/admin_notes").catch(() => [])
    ]);
    setSessions(sessionRows);
    setNotes(Array.isArray(noteRows) ? noteRows : []);
    return sessionRows;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const request = code
      ? api(`/admin/sessions/${encodeURIComponent(code)}`).then((session) => [session]).catch(async () => {
        const rows = await api("/admin/sessions");
        const match = rows.find((row) => row.session_code === code);
        if (!match) throw new Error("Session not found.");
        return [match];
      })
      : load(phone);
    Promise.all([
      request,
      api("/admin/admin_notes").catch(() => [])
    ]).then(([sessionRows, noteRows]) => {
      if (cancelled) return;
      setSessions(sessionRows);
      setNotes(Array.isArray(noteRows) ? noteRows : []);
      setError("");
    }).catch((err) => {
      if (!cancelled) setError(err.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function refresh() {
    if (code) {
      const session = await api(`/admin/sessions/${encodeURIComponent(code)}`);
      setSessions([session]);
      setNotes(await api("/admin/admin_notes").catch(() => []));
      return;
    }
    await load(phone);
  }

  const listed = code ? sessions.filter((session) => session.session_code === code) : sessions;
  const visible = !code && status ? listed.filter((session) => session.status === status) : listed;

  return (
    <section>
      <header className="page-head">
        {code ? (
          <button type="button" className="ghost" onClick={() => navigate("/sessions")}>Back to sessions</button>
        ) : null}
        <h1>{code ? `Session ${code}` : "Sessions"}</h1>
        <p>Verify each payment, resolve comments, and tip the therapists on the session.</p>
      </header>
      {code ? null : (
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            load().catch((err) => setError(err.message));
          }}
        >
          <input
            placeholder="Client phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit">Show client</button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setPhone("");
              setStatus("");
              load("").catch((err) => setError(err.message));
            }}
          >
            All sessions
          </button>
        </form>
      )}
      {error ? <p className="error">{error}</p> : null}
      {loading && !visible.length ? <p className="muted">Loading sessions…</p> : null}
      {!loading && !visible.length ? <p className="muted">{status ? "No sessions with that status." : "No sessions."}</p> : null}
      <div className="stack wide">
        {visible.map((session) => (
          <SessionCard
            key={session.session_code}
            session={session}
            notes={notes.filter((note) => note.session_code === session.session_code)}
            onChange={refresh}
            onDeleted={() => {
              if (code) navigate("/sessions");
              else return refresh();
            }}
            linked={!code}
            defaultOpen={Boolean(code)}
          />
        ))}
      </div>
    </section>
  );
}
