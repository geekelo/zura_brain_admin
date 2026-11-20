import { useEffect, useState } from "react";
import { api, getAdminCode } from "../api";
import { formatAmount, formatDate } from "../format";
import { ClientLink, SessionLink } from "../components/RecordLink";

const STATUSES = [
  ["pending", "Pending"],
  ["ok", "Ok"],
  ["refunded", "Refunded"],
  ["nonrefunded", "Nonrefunded"]
];

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    const sessions = await api("/admin/sessions");
    const next = sessions.flatMap((session) => (session.payment_methods || []).map((payment) => ({
      ...payment,
      session_code: session.session_code,
      session_date: session.session_date,
      client_name: session.client?.name,
      client_phone: session.client?.phone
    }))).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    setPayments(next);
    setSelected((current) => current.filter((id) => next.some((payment) => payment.id === id && payment.status === "nonrefunded")));
    setLoading(false);
    return next;
  }

  const visible = status ? payments.filter((payment) => payment.status === status) : payments;
  const selectable = visible.filter((payment) => payment.status === "nonrefunded" && payment.id != null);
  const chosen = payments.filter((payment) => selected.includes(payment.id));
  const selectedTotal = chosen.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const allSelectableChecked = selectable.length > 0 && selectable.every((payment) => selected.includes(payment.id));

  function toggle(id) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleVisible(checked) {
    const ids = selectable.map((payment) => payment.id);
    setSelected((current) => {
      if (checked) return [...new Set([...current, ...ids])];
      return current.filter((id) => !ids.includes(id));
    });
  }

  async function refundSelected() {
    const rows = payments.filter((payment) => selected.includes(payment.id) && payment.status === "nonrefunded");
    if (!rows.length) {
      setError("Select nonrefunded payments to refund.");
      return;
    }
    const total = rows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (!window.confirm(`Refund ${rows.length} payments totaling ${formatAmount(total)}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    const failures = [];
    for (const payment of rows) {
      try {
        await api(`/admin/payment_methods/${payment.id}`, {
          method: "PATCH",
          body: { tc: getAdminCode(), payment_method: { status: "refunded" } }
        });
      } catch (err) {
        failures.push(err.message);
      }
    }
    try {
      await load();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    if (failures.length) setError(failures[0]);
    else setNotice(`Refunded ${rows.length} payments totaling ${formatAmount(total)}.`);
    setBusy(false);
  }

  return (
    <section>
      <header className="page-head">
        <h1>Payments</h1>
        <p>Filter by status. Select nonrefunded payments, check the total, then refund them.</p>
      </header>
      <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
        <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <div className="refund-bar">
        <p>Selected {chosen.length} · Total {formatAmount(selectedTotal)}</p>
        <button type="button" disabled={!chosen.length || busy} onClick={refundSelected}>
          Refund
        </button>
      </div>
      {loading && !payments.length ? <p className="muted">Loading payments…</p> : null}
      {!loading && !visible.length ? <p className="muted">{status ? "No payments with that status." : "No payments."}</p> : null}
      {visible.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <label className="check">
                    <input
                      type="checkbox"
                      aria-label="Select all nonrefunded payments"
                      checked={allSelectableChecked}
                      disabled={!selectable.length}
                      onChange={(event) => toggleVisible(event.target.checked)}
                    />
                  </label>
                </th>
                <th>Date</th>
                <th>Session</th>
                <th>Client</th>
                <th>Type</th>
                <th>Source</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((payment) => {
                const canSelect = payment.status === "nonrefunded" && payment.id != null;
                return (
                  <tr key={payment.id || `${payment.session_code}-${payment.created_at}-${payment.amount}`} className={selected.includes(payment.id) ? "selected" : ""}>
                    <td data-label="Select">
                      {canSelect ? (
                        <label className="check">
                          <input
                            type="checkbox"
                            aria-label={`Select ${label(payment.type)} ${formatAmount(payment.amount)}`}
                            checked={selected.includes(payment.id)}
                            onChange={() => toggle(payment.id)}
                          />
                        </label>
                      ) : "—"}
                    </td>
                    <td data-label="Date">{formatDate(payment.created_at || payment.session_date)}</td>
                    <td data-label="Session"><SessionLink code={payment.session_code} /></td>
                    <td data-label="Client"><ClientLink name={payment.client_name} phone={payment.client_phone} /></td>
                    <td data-label="Type">{label(payment.type)}</td>
                    <td data-label="Source">{label(payment.source)}</td>
                    <td data-label="Amount">{formatAmount(payment.amount)}</td>
                    <td data-label="Status"><span className={`pill ${payment.status}`}>{label(payment.status)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function label(value) {
  const known = STATUSES.find(([status]) => status === value);
  if (known) return known[1];
  if (!value) return "—";
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
