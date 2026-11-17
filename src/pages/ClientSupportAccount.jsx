import { useEffect, useState } from "react";
import { api } from "../api";
import { formatAmount, formatDate, formatYesNo } from "../format";

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

export default function ClientSupportAccount() {
  const [detail, setDetail] = useState(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState([]);
  const [settleDescription, setSettleDescription] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [entryType, setEntryType] = useState("payout");
  const [accountType, setAccountType] = useState("extra");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

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
      setDetail(await api(`/admin/client_supports${query}`));
      setSelected([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const supports =
    detail?.client_supports ||
    detail?.supports ||
    [];
  const summaries = detail?.summaries || [];
  const payins = supports.filter((row) => String(row.type).toLowerCase() === "payin");
  const payouts = supports.filter((row) => String(row.type).toLowerCase() === "payout");
  const totals = monthTotals(summaries, month, year, payins, payouts);

  function toggleRow(id) {
    setSelected((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function resetForm() {
    setSessionCode("");
    setDescription("");
    setNotes("");
    setAmount("");
    setEntryType("payout");
    setAccountType("extra");
  }

  function openAdd() {
    setEditing(null);
    resetForm();
    setAdding(true);
  }

  function openUpdate(row) {
    setAdding(false);
    setEditing(row);
    setSessionCode(row.session_code || row.ss || "");
    setDescription(row.description || "");
    setNotes(row.notes || "");
    setAmount(row.amount ?? "");
    setEntryType(row.type || "payout");
    setAccountType(row.account_type === "extra account" ? "extra" : (row.account_type || ""));
  }

  function closeForm() {
    setAdding(false);
    setEditing(null);
    resetForm();
  }

  async function saveSupport(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const clientSupport = {
      description,
      notes,
      amount: Number(amount),
      type: entryType,
      account_type: accountType
    };
    if (sessionCode.trim()) clientSupport.session_code = sessionCode.trim();
    try {
      if (editing) {
        await api(`/admin/client_supports/${editing.id}`, {
          method: "PATCH",
          body: { client_support: clientSupport }
        });
        setNotice("Client support updated.");
      } else {
        await api("/admin/client_supports", {
          method: "POST",
          body: { client_support: clientSupport }
        });
        setNotice("Client support created.");
      }
      closeForm();
      await load(month, year);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteSupport(row) {
    if (row.settled || row.id == null) return;
    const label = row.description || "this client support";
    if (!window.confirm(`Delete ${label}?`)) return;
    setError("");
    setNotice("");
    try {
      await api(`/admin/client_supports/${row.id}`, { method: "DELETE" });
      if (editing?.id === row.id) closeForm();
      setNotice("Client support deleted.");
      await load(month, year);
    } catch (err) {
      setError(err.message);
    }
  }

  async function settleSelected(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!selected.length) {
      setError("Select the rows to settle.");
      return;
    }
    try {
      const result = await api("/admin/client_supports/settle", {
        method: "POST",
        body: {
          description: settleDescription,
          client_support_ids: selected
        }
      });
      setSettleDescription("");
      setNotice(`Settled ${formatAmount(result.amount)} into the ${accountLabel(result.account_type)} account.`);
      await load(month, year);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Client support account</h1>
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
      {loading && !detail ? <p className="muted">Loading client support account…</p> : null}
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
          </div>
          {adding || editing ? (
            <form className="panel" onSubmit={saveSupport}>
              <div className="section-head">
                <h2>{editing ? "Update client support" : "Add client support"}</h2>
                <button type="button" className="ghost" onClick={closeForm}>Close</button>
              </div>
              <label>
                Session
                <input value={sessionCode} onChange={(event) => setSessionCode(event.target.value)} required={!editing} />
              </label>
              <label>
                Description
                <input value={description} onChange={(event) => setDescription(event.target.value)} required />
              </label>
              <label>
                Notes
                <input value={notes} onChange={(event) => setNotes(event.target.value)} />
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
                Account
                <select value={accountType} onChange={(event) => setAccountType(event.target.value)} required>
                  {!accountType ? <option value="">Choose</option> : null}
                  <option value="main">Main</option>
                  <option value="extra">Extra</option>
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
            <h2>Client support</h2>
            <form className="toolbar" onSubmit={settleSelected}>
              <input
                aria-label="Settlement description"
                placeholder="Settlement description"
                value={settleDescription}
                onChange={(event) => setSettleDescription(event.target.value)}
                required
              />
              <button type="submit">Settle selected</button>
            </form>
            <SupportTable
              rows={supports}
              empty="No client support."
              selected={selected}
              onToggle={toggleRow}
              onUpdate={openUpdate}
              onDelete={deleteSupport}
            />
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
                      <th>Settled payin</th>
                      <th>Unsettled payin</th>
                      <th>Payout</th>
                      <th>Settled payout</th>
                      <th>Unsettled payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={`${summary.year}-${summary.month}`}>
                        <td data-label="Month">{monthName(summary.month)}</td>
                        <td data-label="Year">{summary.year}</td>
                        <td data-label="Payin">{formatAmount(summary.total_amount_payin)}</td>
                        <td data-label="Settled payin">{formatAmount(summary.amount_settled_payin)}</td>
                        <td data-label="Unsettled payin">{formatAmount(summary.amount_unsettled_payin)}</td>
                        <td data-label="Payout">{formatAmount(summary.total_amount_payout)}</td>
                        <td data-label="Settled payout">{formatAmount(summary.amount_settled_payout)}</td>
                        <td data-label="Unsettled payout">{formatAmount(summary.amount_unsettled_payout)}</td>
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

function SupportTable({ rows, empty, selected, onToggle, onUpdate, onDelete }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>Date</th>
            <th>Description</th>
            <th>Client</th>
            <th>Session</th>
            <th>Type</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Settled</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || `${row.created_at}-${row.session_code}-${row.description}`}>
              <td data-label="Select">
                <input
                  type="checkbox"
                  aria-label={`Select ${row.description || "client support"}`}
                  checked={selected.includes(row.id)}
                  disabled={row.settled || row.id == null}
                  onChange={() => onToggle(row.id)}
                />
              </td>
              <td data-label="Date">{formatDate(row.created_at || row.session_date)}</td>
              <td data-label="Description">{row.description || "—"}</td>
              <td data-label="Client">{clientLabel(row)}</td>
              <td data-label="Session">{row.session_code || row.ss || "—"}</td>
              <td data-label="Type">{row.type || "—"}</td>
              <td data-label="Account">{accountLabel(row.account_type)}</td>
              <td data-label="Amount">{formatAmount(row.amount)}</td>
              <td data-label="Settled">{formatYesNo(row.settled)}</td>
              <td data-label="Notes">{row.notes || "—"}</td>
              <td className="actions" data-label="Actions">
                {row.settled ? null : (
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

function accountLabel(value) {
  if (value === "extra" || value === "extra account") return "Extra";
  if (value === "main") return "Main";
  return value || "—";
}

function clientLabel(row) {
  const nested = row.client && typeof row.client === "object" ? row.client : null;
  const name = nested?.name || row.client_name || "";
  const phone = nested?.phone || row.client_phone || "";
  return [name, phone].filter(Boolean).join(" · ") || "—";
}

function monthTotals(summaries, month, year, payins, payouts) {
  if (month && year) {
    const summary = summaries.find(
      (row) => Number(row.month) === Number(month) && Number(row.year) === Number(year)
    );
    if (summary) {
      return {
        payin: summary.total_amount_payin,
        payout: summary.total_amount_payout
      };
    }
  }
  const payin = payins.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const payout = payouts.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { payin, payout };
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
