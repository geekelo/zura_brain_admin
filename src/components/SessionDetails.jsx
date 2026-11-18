import TherapistList from "./TherapistList";
import {
  formatAmount,
  formatCycleLength,
  formatDate,
  formatDuration,
  formatStatus,
  formatTime,
  formatYesNo
} from "../format";

const HISTORY_LABELS = {
  pending: "Pending",
  started: "Started",
  ended: "Ended",
  completed: "Completed",
  payment_verified: "Payment verified",
  tipped: "Tipped"
};

export default function SessionDetails({ session, showClient = false }) {
  const history = session.session_history || {};
  const payments = session.payment_methods || [];
  const comments = session.comments || [];
  const activities = Array.isArray(session.session_activities) ? session.session_activities : null;

  return (
    <>
      <dl className="facts">
        {showClient ? (
          <div>
            <dt>Client</dt>
            <dd>
              {session.client?.name || "—"}
              <span className="sub">{session.client?.phone}</span>
            </dd>
          </div>
        ) : null}
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
          <dt>Settled</dt>
          <dd>{formatYesNo(session.settled)}</dd>
        </div>
        <div>
          <dt>Lunez</dt>
          <dd>{formatYesNo(session.lunez)}</dd>
        </div>
        <div>
          <dt>Lunez amount</dt>
          <dd>{formatAmount(session.lunez_amount)}</dd>
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
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(session.duration)}</dd>
        </div>
        <div>
          <dt>Transaction</dt>
          <dd>{session.transaction_id || "—"}</dd>
        </div>
        <div>
          <dt>Created by</dt>
          <dd>{session.session_creator?.work_name || "—"}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(session.created_at)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatDate(session.updated_at)}</dd>
        </div>
      </dl>

      <div className="session-block">
        <h4>History</h4>
        {Object.keys(history).length ? (
          <dl className="facts">
            {Object.entries(history).map(([key, value]) => (
              <div key={key}>
                <dt>{HISTORY_LABELS[key] || key}</dt>
                <dd>{key === "tipped" ? Number(value) || 0 : typeof value === "boolean" ? formatYesNo(value) : String(value)}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="muted">No history.</p>}
      </div>

      <div className="session-block">
        <h4>Therapists</h4>
        <TherapistList therapists={session.session_therapists || []} />
      </div>

      <div className="session-block">
        <h4>Payments</h4>
        {payments.length ? (
          <ul className="detail-list">
            {payments.map((payment, index) => (
              <li key={`${payment.type || "payment"}-${payment.created_at || index}`}>
                <span>{formatStatus(payment.type) === payment.type ? capitalize(payment.type) : formatStatus(payment.type)}</span>
                <span>{formatAmount(payment.amount)}</span>
                <span>{capitalize(payment.status)}</span>
                <span>{capitalize(payment.source)}</span>
                <Receipts payment={payment} />
              </li>
            ))}
          </ul>
        ) : <p className="muted">No payments.</p>}
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
              </li>
            ))}
          </ul>
        ) : <p className="muted">No comments.</p>}
      </div>

      {activities ? (
        <div className="session-block">
          <h4>Activity</h4>
          {activities.length ? (
            <ul className="detail-list">
              {activities.map((activity, index) => (
                <li key={`${activity.performed_at || "activity"}-${index}`}>
                  <span>{capitalize(activity.action)}</span>
                  <span>{activity.therapist || "—"}</span>
                  <span>{formatDate(activity.performed_at)} {formatTime(activity.performed_at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">No activity.</p>}
        </div>
      ) : null}
    </>
  );
}

function Receipts({ payment }) {
  const receipts = Array.isArray(payment.payment_url) ? payment.payment_url : [];
  const links = receipts.filter((receipt) => typeof receipt?.img_url === "string" && /^https?:\/\//.test(receipt.img_url));
  if (!links.length) return null;
  return links.map((receipt) => (
    <a key={receipt.img_url} href={receipt.img_url} target="_blank" rel="noreferrer">Receipt</a>
  ));
}

function capitalize(value) {
  if (!value) return "—";
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
