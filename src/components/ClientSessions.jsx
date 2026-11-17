import SessionCard from "./SessionCard";

export default function ClientSessions({ sessions, notes = [], onUpdated }) {
  if (!sessions.length) return <p className="muted">No sessions yet.</p>;
  return (
    <div className="stack wide">
      {sessions.map((session) => (
        <SessionCard
          key={session.session_code}
          session={session}
          notes={notes.filter((note) => note.session_code === session.session_code)}
          onChange={onUpdated}
        />
      ))}
    </div>
  );
}
