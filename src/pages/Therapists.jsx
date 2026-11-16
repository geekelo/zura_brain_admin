import { useEffect, useState } from "react";
import { api, getAdminCode } from "../api";
import { formatAmount, formatCycleLength, formatDate, formatRole } from "../format";

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

export default function Therapists() {
  const [therapists, setTherapists] = useState([]);
  const [workName, setWorkName] = useState("");
  const [code, setCode] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [active, setActive] = useState(true);
  const [selectedCode, setSelectedCode] = useState("");
  const [detail, setDetail] = useState(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setTherapists(await api("/admin/therapists"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function openTherapist(therapist) {
    setSelectedCode(therapist.code);
    setDetail(null);
    setMonth("");
    setYear("");
    setError("");
    setNotice("");
    await loadDetail(therapist.code, "", "");
  }

  async function loadDetail(nextCode, nextMonth, nextYear) {
    const periodError = periodMessage(nextMonth, nextYear);
    if (periodError) {
      setError(periodError);
      return;
    }
    setLoadingDetail(true);
    setError("");
    try {
      const query = nextMonth && nextYear ? `?month=${nextMonth}&year=${nextYear}` : "";
      setDetail(await api(`/admin/therapists/${encodeURIComponent(nextCode)}${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeDetail() {
    setSelectedCode("");
    setDetail(null);
    setError("");
    setNotice("");
  }

  async function createTherapist(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await api("/admin/therapists", {
        method: "POST",
        body: {
          tc: getAdminCode(),
          therapist: { work_name: workName, code, active: true }
        }
      });
      setWorkName("");
      setCode("");
      setNotice("Therapist created.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await api(`/admin/therapists/${encodeURIComponent(statusCode)}/status`, {
        method: "PATCH",
        body: { tc: getAdminCode(), active }
      });
      setNotice(`${statusCode} is now ${active ? "active" : "inactive"}.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (selectedCode) {
    const earnings = detail?.earnings || {};
    const sessions = earnings.session_therapist || [];
    const payins = earnings.payins || [];
    const payouts = earnings.payouts || [];
    const totals = earnings.totals || {};
    const summaries = detail?.account_summaries || [];

    return (
      <section className="detail">
        <header className="page-head">
          <button type="button" className="ghost" onClick={closeDetail}>Back to therapists</button>
          <h1>{detail?.work_name || "Therapist"}</h1>
          <p>{detail ? `Code ${detail.code}` : "Loading earnings…"}</p>
        </header>
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            loadDetail(selectedCode, month, year);
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
              loadDetail(selectedCode, "", "");
            }}
          >
            All earnings
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        {loadingDetail && !detail ? <p className="muted">Loading earnings…</p> : null}
        {detail ? (
          <>
            <dl className="facts">
              <div>
                <dt>Code</dt>
                <dd>{detail.code}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{detail.active ? "Active" : "Inactive"}</dd>
              </div>
            </dl>
            <div className="cards">
              <article>
                <span>Tip share</span>
                <strong>{formatAmount(totals.session_therapist)}</strong>
              </article>
              <article>
                <span>Payins</span>
                <strong>{formatAmount(totals.payins)}</strong>
              </article>
              <article>
                <span>Payouts</span>
                <strong>{formatAmount(totals.payouts)}</strong>
              </article>
            </div>
            <section className="panel">
              <h2>Sessions</h2>
              {sessions.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Session</th>
                        <th>Role</th>
                        <th>Cycle</th>
                        <th>Cycle length</th>
                        <th>Tip</th>
                        <th>Tip share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={`${session.session_code}-${session.role}`}>
                          <td data-label="Date">{formatDate(session.session_date)}</td>
                          <td data-label="Session">{session.session_code || "—"}</td>
                          <td data-label="Role">{formatRole(session.role)}</td>
                          <td data-label="Cycle">{session.cycle ?? "—"}</td>
                          <td data-label="Cycle length">{formatCycleLength(session.cycle_length)}</td>
                          <td data-label="Tip">{formatAmount(session.tip_amount)}</td>
                          <td data-label="Tip share">{formatAmount(session.tip_balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="muted">No session earnings.</p>}
            </section>
            <section className="panel">
              <h2>Payins</h2>
              <MoneyList entries={payins} empty="No payins." />
            </section>
            <section className="panel">
              <h2>Payouts</h2>
              <MoneyList entries={payouts} empty="No payouts." />
            </section>
            <section className="panel">
              <h2>Account summaries</h2>
              {summaries.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Year</th>
                        <th>Payins</th>
                        <th>Payouts</th>
                        <th>Tip share</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaries.map((summary) => (
                        <tr key={`${summary.year}-${summary.month}`}>
                          <td data-label="Month">{monthName(summary.month)}</td>
                          <td data-label="Year">{summary.year}</td>
                          <td data-label="Payins">{formatAmount(summary.total_therapist_payin)}</td>
                          <td data-label="Payouts">{formatAmount(summary.total_therapist_payout)}</td>
                          <td data-label="Tip share">{formatAmount(summary.total_tip_balance)}</td>
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

  return (
    <section>
      <header className="page-head">
        <h1>Therapists</h1>
        <p>Select a therapist to see her code and earnings.</p>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <div className="split">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Work name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {therapists.map((therapist) => (
                <tr key={therapist.code || therapist.work_name} onClick={() => openTherapist(therapist)}>
                  <td data-label="Work name">{therapist.work_name}</td>
                  <td data-label="Status">{therapist.active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stack">
          <form className="panel" onSubmit={createTherapist}>
            <h2>Add therapist</h2>
            <label>
              Work name
              <input value={workName} onChange={(event) => setWorkName(event.target.value)} required />
            </label>
            <label>
              Code
              <input value={code} onChange={(event) => setCode(event.target.value)} required />
            </label>
            <button type="submit">Create</button>
          </form>
          <form className="panel" onSubmit={changeStatus}>
            <h2>Change status</h2>
            <label>
              Therapist code
              <input value={statusCode} onChange={(event) => setStatusCode(event.target.value)} required />
            </label>
            <label className="check">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
              Active
            </label>
            <button type="submit">Update status</button>
          </form>
        </div>
      </div>
    </section>
  );
}

function MoneyList({ entries, empty }) {
  if (!entries.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="therapist-list">
      {entries.map((entry, index) => (
        <li key={`${entry.type}-${entry.amount}-${index}`}>
          <span className="therapist-name">{formatAmount(entry.amount)}</span>
          <span>{entry.description || "—"}</span>
        </li>
      ))}
    </ul>
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
