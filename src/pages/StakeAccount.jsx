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

export default function StakeAccount() {
  const [detail, setDetail] = useState(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState([]);
  const [settleDescription, setSettleDescription] = useState("");

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
      setDetail(await api(`/admin/stakes_accounts${query}`));
      setSelected([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const stakes = detail?.stakes_accounts || [];
  const summaries = detail?.summaries || [];
  const totals = detail?.totals || {};

  function toggleRow(id) {
    setSelected((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
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
      const result = await api("/admin/stakes_accounts/settle", {
        method: "POST",
        body: {
          description: settleDescription,
          stakes_account_ids: selected
        }
      });
      setSettleDescription("");
      setNotice(`Settled ${formatAmount(result.amount)} as a main account expense.`);
      await load(month, year);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Stake account</h1>
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
      {loading && !detail ? <p className="muted">Loading Stake account…</p> : null}
      {detail ? (
        <>
          <div className="cards">
            <article>
              <span>Total</span>
              <strong>{formatAmount(totals.total_amount)}</strong>
            </article>
            <article>
              <span>Settled</span>
              <strong>{formatAmount(totals.amount_settled)}</strong>
            </article>
            <article>
              <span>Unsettled</span>
              <strong>{formatAmount(totals.amount_unsettled)}</strong>
            </article>
          </div>
          <section className="panel">
            <h2>Stakes</h2>
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
            {stakes.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Settled</th>
                      <th>Session</th>
                      <th>Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakes.map((stake) => (
                      <tr key={stake.id}>
                        <td data-label="Select">
                          <input
                            type="checkbox"
                            aria-label={`Select ${stake.client_name || stake.session_code || "stake"}`}
                            checked={selected.includes(stake.id)}
                            disabled={stake.settled || stake.id == null}
                            onChange={() => toggleRow(stake.id)}
                          />
                        </td>
                        <td data-label="Date">{formatDate(stake.created_at)}</td>
                        <td data-label="Amount">{formatAmount(stake.amount)}</td>
                        <td data-label="Settled">{formatYesNo(stake.settled)}</td>
                        <td data-label="Session">{stake.session_code || "—"}</td>
                        <td data-label="Client">{stake.client_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">No stakes.</p>}
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
                      <th>Total</th>
                      <th>Settled</th>
                      <th>Unsettled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={`${summary.year}-${summary.month}`}>
                        <td data-label="Month">{monthName(summary.month)}</td>
                        <td data-label="Year">{summary.year}</td>
                        <td data-label="Total">{formatAmount(summary.total_amount)}</td>
                        <td data-label="Settled">{formatAmount(summary.amount_settled)}</td>
                        <td data-label="Unsettled">{formatAmount(summary.amount_unsettled)}</td>
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

function periodMessage(month, year) {
  if (!month && !year) return "";
  if (!month || !year) return "Choose both a month and a year.";
  if (!/^\d{4}$/.test(year)) return "Enter a four-digit year.";
  return "";
}

function monthName(month) {
  return MONTHS.find(([value]) => Number(value) === Number(month))?.[1] || month || "—";
}
