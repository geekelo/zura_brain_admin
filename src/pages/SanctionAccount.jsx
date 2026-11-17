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

export default function SanctionAccount() {
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
  const [entryType, setEntryType] = useState("payout");
  const [therapistCode, setTherapistCode] = useState("");
  const [nonTherapist, setNonTherapist] = useState("");

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
      setDetail(await api(`/admin/sanctions${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const sanctions = detail?.sanctions || [];
  const summaries = detail?.summaries || [];
  const payins = sanctions.filter((row) => String(row.type).toLowerCase() === "payin");
  const payouts = sanctions.filter((row) => String(row.type).toLowerCase() === "payout");
  const totals = monthTotals(summaries, month, year, payins, payouts);

  function resetForm() {
    setDescription("");
    setAmount("");
    setEntryType("payout");
    setTherapistCode("");
    setNonTherapist("");
  }

  function openAdd() {
    setEditing(null);
    resetForm();
    setAdding(true);
  }

  function openUpdate(row) {
    setAdding(false);
    setEditing(row);
    setDescription(row.description || "");
    setAmount(row.amount ?? "");
    setEntryType(row.type || "payout");
    setTherapistCode(row.therapist_code || "");
    setNonTherapist(row.non_therapist || "");
  }

  function closeForm() {
    setAdding(false);
    setEditing(null);
    resetForm();
  }

  async function saveSanction(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const sanction = {
      description,
      amount: Number(amount),
      type: entryType,
      non_therapist: nonTherapist
    };
    if (therapistCode.trim()) sanction.therapist_code = therapistCode.trim();
    const body = { sanction };
    try {
      if (editing) {
        await api(`/admin/sanctions/${editing.id}`, { method: "PATCH", body });
        setNotice("Sanction updated.");
      } else {
        await api("/admin/sanctions", { method: "POST", body });
        setNotice("Sanction created.");
      }
      closeForm();
      await load(month, year);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteSanction(row) {
    if (row.id == null) return;
    const label = row.description || "this sanction";
    if (!window.confirm(`Delete ${label}?`)) return;
    setError("");
    setNotice("");
    try {
      await api(`/admin/sanctions/${row.id}`, { method: "DELETE" });
      if (editing?.id === row.id) closeForm();
      setNotice("Sanction deleted.");
      await load(month, year);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Sanction account</h1>
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
      {loading && !detail ? <p className="muted">Loading sanction account…</p> : null}
      {detail ? (
        <>
          <div className="cards">
            <article>
              <span>Payins</span>
              <strong>{formatAmount(totals.payin)}</strong>
            </article>
            <article>
              <span>Payouts</span>
              <strong>{formatAmount(totals.payout)}</strong>
            </article>
            <article>
              <span>Balance</span>
              <strong>{formatAmount(totals.balance)}</strong>
            </article>
          </div>
          {adding || editing ? (
            <form className="panel" onSubmit={saveSanction}>
              <div className="section-head">
                <h2>{editing ? "Update sanction" : "Add sanction"}</h2>
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
              <label>
                Therapist code
                <input value={therapistCode} onChange={(event) => setTherapistCode(event.target.value)} />
              </label>
              <label>
                Non-therapist
                <input value={nonTherapist} onChange={(event) => setNonTherapist(event.target.value)} />
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
            <h2>Sanctions</h2>
            <SanctionTable rows={sanctions} empty="No sanctions." onUpdate={openUpdate} onDelete={deleteSanction} />
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
                      <th>Payin</th>
                      <th>Payout</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={`${summary.year}-${summary.month}`}>
                        <td data-label="Month">{monthName(summary.month)}</td>
                        <td data-label="Year">{summary.year}</td>
                        <td data-label="Payin">{formatAmount(summary.total_payin)}</td>
                        <td data-label="Payout">{formatAmount(summary.total_payout)}</td>
                        <td data-label="Balance">{formatAmount(summary.total_balance)}</td>
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

function SanctionTable({ rows, empty, onUpdate, onDelete }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Person</th>
            <th>Type</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || `${row.created_at}-${row.description}`}>
              <td data-label="Date">{formatDate(row.created_at)}</td>
              <td data-label="Description">{row.description || "—"}</td>
              <td data-label="Person">{personLabel(row)}</td>
              <td data-label="Type">{row.type || "—"}</td>
              <td data-label="Amount">{formatAmount(row.amount)}</td>
              <td className="actions" data-label="Actions">
                {row.id == null ? null : (
                  <>
                    <button type="button" className="ghost" onClick={() => onUpdate(row)}>Update</button>
                    <button type="button" className="ghost" onClick={() => onDelete(row)}>Delete</button>
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

function personLabel(row) {
  if (row.therapist_name || row.therapist_code) {
    return [row.therapist_name, row.therapist_code].filter(Boolean).join(" · ");
  }
  if (row.non_therapist) return String(row.non_therapist);
  return "—";
}

function monthTotals(summaries, month, year, payins, payouts) {
  if (month && year) {
    const summary = summaries.find(
      (row) => Number(row.month) === Number(month) && Number(row.year) === Number(year)
    );
    if (summary) {
      return {
        payin: summary.total_payin,
        payout: summary.total_payout,
        balance: summary.total_balance
      };
    }
  }
  const payin = payins.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const payout = payouts.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { payin, payout, balance: payin - payout };
}

function periodMessage(month, year) {
  if (!month && !year) return "";
  if (!month || !year) return "Choose both a month and a year.";
  if (!/^\d{4}$/.test(year)) return "Enter a four-digit year.";
  const m = Number(month);
  if (!Number.isInteger(m) || m < 1 || m > 12) return "Month must be 1–12.";
  return "";
}

function monthName(month) {
  return MONTHS.find(([value]) => Number(value) === Number(month))?.[1] || month || "—";
}
