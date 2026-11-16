import { useEffect, useState } from "react";
import { api } from "../api";

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([api("/admin/clients"), api("/admin/sessions"), api("/admin/therapists")])
      .then(([clients, sessions, therapists]) => {
        if (cancelled) return;
        const countStatus = (status) => sessions.filter((session) => session.status === status).length;
        setStats({
          clients: clients.length,
          sessions: sessions.length,
          pending: countStatus("pending"),
          ongoing: countStatus("started"),
          completed: countStatus("completed"),
          disputed: countStatus("disputed"),
          therapists: therapists.filter((therapist) => therapist.active).length
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading the desk…</p>;

  const cards = [
    ["Clients", stats.clients],
    ["Sessions", stats.sessions],
    ["Pending", stats.pending],
    ["Started", stats.ongoing],
    ["Completed", stats.completed],
    ["Disputed", stats.disputed],
    ["Active therapists", stats.therapists]
  ];

  return (
    <section>
      <header className="page-head">
        <h1>Overview</h1>
        <p>Today’s desk, counted from live sessions and clients.</p>
      </header>
      <div className="cards">
        {cards.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
