import { useState } from "react";
import { api, getAdminCode } from "../api";
import { formatAmount, formatCycleLength, formatDate, formatTime } from "../format";
import TherapistList from "./TherapistList";

const STATUSES = [
  ["pending", "Pending"],
  ["started", "Started"],
  ["ended", "Ended"],
  ["completed", "Completed"],
  ["disputed", "Disputed"]
];

export default function ClientSessions({ sessions, onUpdated }) {
  const [busyCode, setBusyCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function setStatus(session, status) {
    if (status === session.status) return;
    setBusyCode(session.session_code);
    setError("");
    setNotice("");
    try {
      await api(`/admin/sessions/${session.session_code}/status`, {
        method: "PATCH",
        body: { tc: getAdminCode(), status }
      });
      await onUpdated();
      setNotice(`${session.session_code} marked ${statusLabel(status)}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyCode("");
    }
  }

  async function verifyPayment(session) {
    setBusyCode(`${session.session_code}-verify`);
    setError("");
    setNotice("");
    try {
      await api(`/admin/sessions/${session.session_code}/verify_payment`, {
        method: "PATCH",
        body: { tc: getAdminCode() }
      });
      await onUpdated();
      setNotice(`Payment verified for ${session.session_code}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyCode("");
    }
  }

  if (!sessions.length) return <p className="muted">No sessions yet.</p>;

  return (
    <div className="stack wide">
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {sessions.map((session) => {
        const verified = Boolean(session.session_history?.payment_verified);
        const therapists = session.session_therapists || [];
        const comments = session.comments || [];
        const statusOptions = STATUSES.some(([value]) => value === session.status)
          ? STATUSES
          : [[session.status, session.status], ...STATUSES];
        return (
          <article key={session.session_code} className="panel session-card">
            <div className="section-head">
              <h3>{session.session_code}</h3>
              <span className={`pill ${session.status}`}>{statusLabel(session.status)}</span>
            </div>
            <dl className="facts">
              <div>
                <dt>Date</dt>
                <dd>{formatDate(session.session_date)}</dd>
              </div>
              <div>
                <dt>Cycle</dt>
                <dd>{session.cycle ?? "—"}</dd>
              </div>
              <div>
                <dt>Cycle length</dt>
                <dd>{formatCycleLength(session.cycle_length)}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{formatAmount(session.amount)}</dd>
              </div>
              <div>
                <dt>Massage</dt>
                <dd>{session.massage_type || "—"}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{session.session_type || "—"}</dd>
              </div>
              <div>
                <dt>Hands</dt>
                <dd>{session.hands || "—"}</dd>
              </div>
              <div>
                <dt>Start</dt>
                <dd>{formatTime(session.start_time)}</dd>
              </div>
              <div>
                <dt>End</dt>
                <dd>{formatTime(session.end_time)}</dd>
              </div>
              <div className="span-all">
                <dt>Therapists</dt>
                <dd><TherapistList therapists={therapists} /></dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{verified ? "Verified" : "Not verified"}</dd>
              </div>
            </dl>
            {comments.length ? (
              <ul className="comments">
                {comments.map((entry, index) => (
                  <li key={`${entry.date_time || "comment"}-${index}`}>
                    <strong>{entry.name || "Note"}</strong>
                    {entry.resolved ? <span className="pill">Resolved</span> : null}
                    <span className="sub">{entry.comment}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="session-edit">
              <label>
                Status
                <select
                  value={session.status || ""}
                  disabled={busyCode === session.session_code}
                  onChange={(event) => setStatus(session, event.target.value)}
                >
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="ghost"
                disabled={verified || busyCode === `${session.session_code}-verify`}
                onClick={() => verifyPayment(session)}
              >
                {verified ? "Payment verified" : "Verify payment"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function statusLabel(status) {
  return STATUSES.find(([value]) => value === status)?.[1] || status || "—";
}
