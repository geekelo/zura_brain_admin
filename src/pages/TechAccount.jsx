import { useEffect, useState } from "react";
import { api } from "../api";
import { formatAmount, formatDate } from "../format";

const MONTHS = [
  ["1", "January"],
  ["2", "February"],
  ["3", "March"],
  ["4", "April"],
  ["5", "May"],
  ["6", "June"],
  ["7", "July"],
  ["8", "August"],
  ["9", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"]
];

export default function TechAccount() {
  const [detail, setDetail] = useState(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [entryType, setEntryType] = useState("payin");

  useEffect(() => {
    load("", "").catch((err) => setError(err.message));
  }, []);

  async function load(nextMonth, nextYear) {
    const periodError = periodMessage(nextMonth, nextYear);
    if (periodError) {
      setError(periodError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = nextMonth && nextYear ? `?month=${nextMonth}&year=${nextYear}` : "";
      setDetail(await api(`/admin/tech_accounts${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const payins = detail?.payins || [];
  const payouts = detail?.payouts || [];
  const summaries = detail?.summaries || [];
  const totals = detail?.totals || {};

  function resetForm() {
    setDescription("");
    setAmount("");
    setEntryType("payin");
  }

  function openAdd() {
    setEditing(null);
    resetForm();
    setAdding(true);
  }

  function openUpdate(entry) {
    setAdding(false);
    setEditing(entry);
    setDescription(entry.description || "");
    setAmount(entry.amount ?? "");
    setEntryType(entry.type || "payin");
  }

  function closeForm() {
    setAdding(false);
    setEditing(null);
    resetForm();
  }

  async function saveEntry(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const body = {
      tech_payin_payout: {
        description,
        amount: Number(amount),
        type: entryType
      }
    };
    try {
      if (editing) {
        await api(`/admin/tech_payins_payouts/${editing.id}`, { method: "PATCH", body });
        setNotice("Tech account entry updated.");
      } else {
        await api("/admin/tech_payins_payouts", { method: "POST", body });
        setNotice("Tech account entry created.");
      }
      closeForm();
      await load(month, year);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteEntry(entry) {
    if (entry.id == null) return;
    const label = entry.description || "this entry";
    if (!window.confirm(`Delete ${label}?`)) return;
    setError("");
    setNotice("");
    try {
      await api(`/admin/tech_payins_payouts/${entry.id}`, { method: "DELETE" });
      if (editing?.id === entry.id) closeForm();
      setNotice("Tech account entry deleted.");
      await load(month, year);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Tech account</h1>
      </header>
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          load(month, year);
        }}
      >
        <select aria-label="Month" value={month} onChange={(event) => setMonth(event.target.value)}>
          <option value="">All months</option>
          {MONTHS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          aria-label="Year"
          inputMode="numeric"
          placeholder="Year"
          value={year}
          onChange={(event) => setYear(event.target.value)}
        />
        <button type="submit">Show month</button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setMonth("");
            setYear("");
            load("", "");
          }}
        >
          All records
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {loading && !detail ? <p className="muted">Loading tech account…</p> : null}
      {detail ? (
        <>
          <div className="cards">
            <article>
              <span>Payins</span>
              <strong>{formatAmount(totals.payins)}</strong>
            </article>
            <article>
              <span>Payouts</span>
              <strong>{formatAmount(totals.payouts)}</strong>
            </article>
          </div>
          {adding || editing ? (
            <form className="panel" onSubmit={saveEntry}>
              <div className="section-head">
                <h2>{editing ? "Update tech account" : "Add tech account"}</h2>
                <button type="button" className="ghost" onClick={closeForm}>Close</button>
              </div>
              <label>
                Description
                <input value={description} onChange={(event) => setDescription(event.target.value)} required />
              </label>
              <label>
                Amount
                <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </label>
              <label>
                Type
                <select value={entryType} onChange={(event) => setEntryType(event.target.value)}>
                  <option value="payin">Payin</option>
                  <option value="payout">Payout</option>
                </select>
              </label>
              <div className="form-actions">
                <button type="submit">{editing ? "Update" : "Create"}</button>
                <button type="button" className="ghost" onClick={closeForm}>Close</button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={openAdd}>Add</button>
          )}
          <section className="panel">
            <h2>Payins</h2>
            <EntryTable entries={payins} empty="No payins." onUpdate={openUpdate} onDelete={deleteEntry} />
          </section>
          <section className="panel">
            <h2>Payouts</h2>
            <EntryTable entries={payouts} empty="No payouts." onUpdate={openUpdate} onDelete={deleteEntry} />
          </section>
          <section className="panel">
            <h2>Monthly summaries</h2>
            {summaries.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Year</th>
                      <th>Payins</th>
                      <th>Payouts</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={`${summary.year}-${summary.month}`}>
                        <td data-label="Month">{monthName(summary.month)}</td>
                        <td data-label="Year">{summary.year}</td>
                        <td data-label="Payins">{formatAmount(summary.total_tech_payin)}</td>
                        <td data-label="Payouts">{formatAmount(summary.total_tech_payout)}</td>
                        <td data-label="Balance">{formatAmount(summary.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">No saved monthly summary.</p>}
          </section>
        </>
      ) : null}
    </section>
  );
}

function linkedPayin(entry) {
  return String(entry.type).toLowerCase() === "payin" && Boolean(entry.session_code || entry.therapist_name);
}

function EntryTable({ entries, empty, onUpdate, onDelete }) {
  if (!entries.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Session</th>
            <th>Therapist</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id || `${entry.created_at}-${entry.session_code}-${index}`}>
              <td data-label="Date">{formatDate(entry.created_at)}</td>
              <td data-label="Amount">{formatAmount(entry.amount)}</td>
              <td data-label="Description">{entry.description || "—"}</td>
              <td data-label="Session">{entry.session_code || "—"}</td>
              <td data-label="Therapist">{entry.therapist_name || "—"}</td>
              <td className="actions" data-label="Actions">
                {entry.id == null || linkedPayin(entry) ? null : (
                  <>
                    <button type="button" className="ghost" onClick={() => onUpdate(entry)}>Update</button>
                    <button type="button" className="ghost" onClick={() => onDelete(entry)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function periodMessage(month, year) {
  if (!month && !year) return "";
  if (!month || !year) return "Choose both a month and a year.";
  if (!/^\d{4}$/.test(year)) return "Enter a four-digit year.";
  return "";
}

function monthName(month) {
  return MONTHS.find(([value]) => Number(value) === Number(month))?.[1] || month || "—";
}
