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

export default function MainAccount() {
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
      setDetail(await api(`/admin/main_accounts${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const expenses = detail?.expenses || [];
  const summaries = detail?.summaries || [];
  const totals = detail?.totals || {};

  return (
    <section>
      <header className="page-head">
        <h1>Main account</h1>
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
      {loading && !detail ? <p className="muted">Loading main account…</p> : null}
      {detail ? (
        <>
          <div className="cards">
            <article>
              <span>Expenses</span>
              <strong>{formatAmount(totals.expenses)}</strong>
            </article>
          </div>
          <section className="panel">
            <h2>Expenses</h2>
            {expenses.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense, index) => (
                      <tr key={`${expense.created_at}-${expense.amount}-${index}`}>
                        <td data-label="Date">{formatDate(expense.created_at)}</td>
                        <td data-label="Amount">{formatAmount(expense.amount)}</td>
                        <td data-label="Description">{expense.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">No expenses.</p>}
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
                      <th>Session inflow</th>
                      <th>Lunez inflow</th>
                      <th>Expenses</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={`${summary.year}-${summary.month}`}>
                        <td data-label="Month">{monthName(summary.month)}</td>
                        <td data-label="Year">{summary.year}</td>
                        <td data-label="Session inflow">{formatAmount(summary.total_session_inflow)}</td>
                        <td data-label="Lunez inflow">{formatAmount(summary.total_lunez_inflow)}</td>
                        <td data-label="Expenses">{formatAmount(summary.total_main_account_outflow)}</td>
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
