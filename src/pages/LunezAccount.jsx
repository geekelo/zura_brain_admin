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

export default function LunezAccount() {
  const [detail, setDetail] = useState(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setDetail(await api(`/admin/lunez_accounts${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inflows = detail?.inflows || [];
  const summaries = detail?.summaries || [];
  const totals = detail?.totals || {};

  return (
    <section>
      <header className="page-head">
        <h1>Lunez account</h1>
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
      {loading && !detail ? <p className="muted">Loading Lunez account…</p> : null}
      {detail ? (
        <>
          <div className="cards">
            <article>
              <span>Inflows</span>
              <strong>{formatAmount(totals.inflows)}</strong>
            </article>
          </div>
          <section className="panel">
            <h2>Inflows</h2>
            {inflows.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Session</th>
                      <th>Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inflows.map((inflow, index) => (
                      <tr key={`${inflow.session_code}-${index}`}>
                        <td data-label="Date">{formatDate(inflow.session_date)}</td>
                        <td data-label="Amount">{formatAmount(inflow.lunez_amount)}</td>
                        <td data-label="Session">{inflow.session_code || "—"}</td>
                        <td data-label="Client">{inflow.client_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">No Lunez inflows.</p>}
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
                      <th>Inflow</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={`${summary.year}-${summary.month}`}>
                        <td data-label="Month">{monthName(summary.month)}</td>
                        <td data-label="Year">{summary.year}</td>
                        <td data-label="Inflow">{formatAmount(summary.total_inflow)}</td>
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

function periodMessage(month, year) {
  if (!month && !year) return "";
  if (!month || !year) return "Choose both a month and a year.";
  if (!/^\d{4}$/.test(year)) return "Enter a four-digit year.";
  return "";
}

function monthName(month) {
  return MONTHS.find(([value]) => Number(value) === Number(month))?.[1] || month || "—";
}
