import { useState } from "react";
import { api, getAdminCode } from "../api";
import { formatAmount, formatCycleLength, formatDate, formatRole, formatTime } from "../format";
import { ClientLink, SessionLink, TherapistLink } from "./RecordLink";
import AdminNoteForm from "./AdminNoteForm";

const STATUSES = [
  ["pending", "Pending"],
  ["started", "Started"],
  ["ended", "Ended"],
  ["completed", "Completed"],
  ["disputed", "Disputed"]
];

const PAYMENT_STATUSES = [
  ["pending", "Pending"],
  ["ok", "Ok"],
  ["refunded", "Refunded"],
  ["nonrefunded", "Nonrefunded"]
];

export default function SessionCard({ session, notes = [], onChange, linked = true }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tips, setTips] = useState({});
  const code = session.session_code;
  const payments = session.payment_methods || [];
  const comments = Array.isArray(session.comments) ? session.comments : [];
  const therapists = session.session_therapists || [];
  const verified = Boolean(session.session_history?.payment_verified);
  const statusOptions = STATUSES.some(([value]) => value === session.status)
    ? STATUSES
    : [[session.status, session.status], ...STATUSES];

  async function run(key, action, message) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      if (onChange) await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  function setStatus(status) {
    if (status === session.status) return;
    run(code, () => api(`/admin/sessions/${code}/status`, {
      method: "PATCH",
      body: { tc: getAdminCode(), status }
    }), `${code} marked ${statusLabel(status)}.`);
  }

  function updatePaymentStatus(payment, status) {
    if (status === payment.status) return;
    run(`payment-${payment.id}`, () => api(`/admin/payment_methods/${payment.id}`, {
      method: "PATCH",
      body: { tc: getAdminCode(), payment_method: { status } }
    }), "Payment status updated.");
  }

  function deletePayment(payment) {
    const name = label(payment.type);
    if (!window.confirm(`Delete this ${name} payment?`)) return;
    run(`payment-delete-${payment.id}`, () => api(`/admin/payment_methods/${payment.id}`, {
      method: "DELETE",
      body: { tc: getAdminCode() }
    }), "Payment method deleted.");
  }

  function resolveComment(index) {
    run(`comment-${index}`, () => api(`/admin/sessions/${code}/comments/resolve`, {
      method: "PATCH",
      body: { index, resolved: true }
    }), "Comment resolved.");
  }

  function sendTip(event, therapist) {
    event.preventDefault();
    const amount = tips[therapist.name];
    run(`tip-${therapist.name}`, () => api("/admin/session_therapists/tip", {
      method: "POST",
      body: {
        ss: code,
        name: therapist.name,
        tip_amount: Number(amount),
        tc: getAdminCode()
      }
    }), `Tip saved for ${therapist.name}.`);
  }

  return (
    <article className="panel session-card">
      <div className="section-head">
        <h3>{linked ? <SessionLink code={code} /> : code}</h3>
        <span className={`pill ${session.status}`}>{statusLabel(session.status)}</span>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <dl className="facts">
        <div>
          <dt>Client</dt>
          <dd>
            <ClientLink name={session.client?.name} phone={session.client?.phone} />
            {session.client?.phone ? <span className="sub">{session.client.phone}</span> : null}
          </dd>
        </div>
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
          <dt>Payment</dt>
          <dd>{verified ? "Verified" : "Not verified"}</dd>
        </div>
      </dl>

      <div className="session-block">
        <h4>Payment methods</h4>
        {payments.length ? (
          <div className="payments">
            {payments.map((payment) => {
              const images = receipts(payment);
              const statusOptions = PAYMENT_STATUSES.some(([value]) => value === payment.status)
                ? PAYMENT_STATUSES
                : [[payment.status, label(payment.status)], ...PAYMENT_STATUSES];
              return (
                <article key={payment.id || `${payment.type}-${payment.created_at}`} className="payment">
                  <div className="payment-meta">
                    <span>{label(payment.type)}</span>
                    <span>{formatAmount(payment.amount)}</span>
                    <span>{label(payment.source)}</span>
                    <label>
                      Status
                      <select
                        aria-label={`Status for ${label(payment.type)} ${formatAmount(payment.amount)}`}
                        value={payment.status || ""}
                        disabled={payment.id == null || busy === `payment-${payment.id}`}
                        onChange={(event) => updatePaymentStatus(payment, event.target.value)}
                      >
                        {statusOptions.map(([value, text]) => (
                          <option key={value} value={value}>{text}</option>
                        ))}
                      </select>
                    </label>
                    {payment.id == null ? null : (
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy === `payment-delete-${payment.id}`}
                        onClick={() => deletePayment(payment)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {images.length ? (
                    <div className="receipts">
                      {images.map((receipt) => (
                        <figure key={receipt.img}>
                          <a href={receipt.img} target="_blank" rel="noreferrer">
                            <img src={receipt.img} alt="Payment receipt" />
                          </a>
                          {receipt.del ? (
                            <a href={receipt.del} target="_blank" rel="noreferrer">Delete image</a>
                          ) : null}
                        </figure>
                      ))}
                    </div>
                  ) : <p className="muted">No receipt image.</p>}
                </article>
              );
            })}
          </div>
        ) : <p className="muted">No payment methods.</p>}
      </div>

      <div className="session-block">
        <h4>Comments</h4>
        {comments.length ? (
          <ul className="comments">
            {comments.map((entry, index) => (
              <li key={`${entry.date_time || "comment"}-${index}`}>
                <strong>{entry.name || "Note"}</strong>
                <span>{formatDate(entry.date_time)}</span>
                {entry.resolved ? <span className="pill">Resolved</span> : <span className="pill">Open</span>}
                <span className="sub">{entry.comment}</span>
                {entry.resolved ? null : (
                  <button
                    type="button"
                    className="ghost"
                    disabled={busy === `comment-${index}`}
                    onClick={() => resolveComment(index)}
                  >
                    Resolve
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="muted">No comments.</p>}
      </div>

      <div className="session-block">
        <h4>Therapists</h4>
        {therapists.length ? therapists.map((therapist, index) => (
          <div className="tip-row" key={`${therapist.name}-${therapist.role}-${index}`}>
            <span>{formatRole(therapist.role)} <TherapistLink code={therapist.code} name={therapist.name} /></span>
            <span>{formatAmount(therapist.tip_amount)} tip amount</span>
            <span>{formatAmount(therapist.tip_balance)} tip balance</span>
            <form onSubmit={(event) => sendTip(event, therapist)}>
              <input
                aria-label={`Tip ${therapist.name || "therapist"}`}
                inputMode="decimal"
                placeholder="Tip"
                value={tips[therapist.name] || ""}
                onChange={(event) => setTips((current) => ({ ...current, [therapist.name]: event.target.value }))}
                required
              />
              <button type="submit" disabled={busy === `tip-${therapist.name}`}>Tip</button>
            </form>
          </div>
        )) : <p className="muted">No therapists.</p>}
      </div>

      <div className="session-block">
        <h4>Admin notes</h4>
        <NoteItems notes={notes} onChange={onChange} />
        <AdminNoteForm
          target={{ ss: code }}
          onCreated={onChange}
        />
      </div>

      <div className="session-edit">
        <label>
          Status
          <select value={session.status || ""} disabled={busy === code} onChange={(event) => setStatus(event.target.value)}>
            {statusOptions.map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <span className="muted">{formatTime(session.start_time)} – {formatTime(session.end_time)}</span>
      </div>
    </article>
  );
}

export function NoteItems({ notes, onChange }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function resolve(note) {
    setBusy(note.id);
    setError("");
    try {
      await api(`/admin/admin_notes/${note.id}`, {
        method: "PATCH",
        body: { tc: getAdminCode(), admin_note: { status: "resolved" } }
      });
      if (onChange) await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (!notes.length) return <p className="muted">No admin notes.</p>;
  return (
    <div className="note-list">
      {error ? <p className="error">{error}</p> : null}
      {notes.map((note) => (
        <article key={note.id || note.created_at} className="note">
          <div className="section-head">
            <span>{formatDate(note.created_at)}</span>
            <span className="pill">{resolvedNote(note) ? "Resolved" : "Unresolved"}</span>
          </div>
          <p className="note-links">
            {note.session_code ? <SessionLink code={note.session_code} /> : null}
            {note.client_name || note.client_phone ? <ClientLink name={note.client_name} phone={note.client_phone} /> : null}
            {note.therapist_name || note.therapist_code ? <TherapistLink name={note.therapist_name} code={note.therapist_code} /> : null}
          </p>
          <p className="preserve">{note.body || "—"}</p>
          {resolvedNote(note) || note.id == null ? null : (
            <button type="button" className="ghost" disabled={busy === note.id} onClick={() => resolve(note)}>
              Resolve
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

export function resolvedNote(note) {
  return String(note.status || "").toLowerCase() === "resolved";
}

function statusLabel(status) {
  return STATUSES.find(([value]) => value === status)?.[1] || status || "—";
}

function receipts(payment) {
  return (Array.isArray(payment.payment_url) ? payment.payment_url : []).flatMap((entry) => {
    if (typeof entry === "string" && entry) return [{ img: entry, del: "" }];
    if (!entry || typeof entry !== "object") return [];
    const img = entry.img_url || entry.url || "";
    if (!img) return [];
    return [{ img, del: entry.del_url || "" }];
  });
}

function label(value) {
  if (!value) return "—";
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
