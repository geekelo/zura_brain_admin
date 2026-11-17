import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, getAdminCode } from "../api";
import AdminNoteForm from "../components/AdminNoteForm";
import { NoteItems } from "../components/SessionCard";
import { SessionLink } from "../components/RecordLink";
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
  const [newCode, setNewCode] = useState("");
  const [active, setActive] = useState(true);
  const [selectedCode, setSelectedCode] = useState("");
  const [detail, setDetail] = useState(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState([]);
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryDescription, setEntryDescription] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryType, setEntryType] = useState("payin");
  const { code: codeParam = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nameQuery = searchParams.get("name") || "";

  async function load() {
    const rows = await api("/admin/therapists");
    setTherapists(rows);
    return rows;
  }

  useEffect(() => {
    let cancelled = false;
    const therapistCode = codeParam ? decodeURIComponent(codeParam) : "";
    load().then((rows) => {
      if (cancelled || (!therapistCode && !nameQuery)) return;
      const match = therapistCode
        ? rows.find((therapist) => therapist.code === therapistCode)
        : rows.find((therapist) => therapist.work_name === nameQuery);
      if (match) openTherapist(match);
      else setError("Therapist not found.");
    }).catch((err) => {
      if (!cancelled) setError(err.message);
    });
    return () => {
      cancelled = true;
    };
  }, [codeParam, nameQuery]);

  async function openTherapist(therapist) {
    setSelectedCode(therapist.code);
    setDetail(null);
    setMonth("");
    setYear("");
    setError("");
    setNotice("");
    closeEntryForm();
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
      const noteRows = await api("/admin/admin_notes").catch(() => []);
      setNotes((Array.isArray(noteRows) ? noteRows : []).filter((note) => note.therapist_code === nextCode));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeDetail() {
    setSelectedCode("");
    setDetail(null);
    setNotes([]);
    setError("");
    setNotice("");
    closeEntryForm();
    navigate("/therapists");
  }

  function resetEntryForm() {
    setEntryDescription("");
    setEntryAmount("");
    setEntryType("payin");
  }

  function closeEntryForm() {
    setAddingEntry(false);
    setEditingEntry(null);
    resetEntryForm();
  }

  function openAddEntry() {
    setEditingEntry(null);
    resetEntryForm();
    setAddingEntry(true);
  }

  function openUpdateEntry(entry) {
    setAddingEntry(false);
    setEditingEntry(entry);
    setEntryDescription(entry.description || "");
    setEntryAmount(entry.amount ?? "");
    setEntryType(entry.type || "payin");
  }

  async function saveEntry(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const body = {
      therapist_payin_payout: {
        therapist_code: selectedCode,
        description: entryDescription,
        amount: Number(entryAmount),
        type: entryType
      }
    };
    try {
      if (editingEntry) {
        await api(`/admin/therapist_payins_payouts/${editingEntry.id}`, { method: "PATCH", body });
        setNotice("Therapist entry updated.");
      } else {
        await api("/admin/therapist_payins_payouts", { method: "POST", body });
        setNotice("Therapist entry created.");
      }
      closeEntryForm();
      await loadDetail(selectedCode, month, year);
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
      await api(`/admin/therapist_payins_payouts/${entry.id}`, { method: "DELETE" });
      if (editingEntry?.id === entry.id) closeEntryForm();
      setNotice("Therapist entry deleted.");
      await loadDetail(selectedCode, month, year);
    } catch (err) {
      setError(err.message);
    }
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
      const nextCode = newCode.trim();
      await api(`/admin/therapists/${encodeURIComponent(statusCode)}/status`, {
        method: "PATCH",
        body: { tc: getAdminCode(), active, ...(nextCode ? { new_code: nextCode } : {}) }
      });
      setNewCode("");
      setNotice(nextCode
        ? `${statusCode} is now ${nextCode} and ${active ? "active" : "inactive"}.`
        : `${statusCode} is now ${active ? "active" : "inactive"}.`);
      if (nextCode) setStatusCode(nextCode);
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
    const sanctions = earnings.sanctions || [];
    const bonuses = earnings.bonuses || [];
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
              <article>
                <span>Sanctions</span>
                <strong>{formatAmount(totals.sanctions)}</strong>
              </article>
              <article>
                <span>Bonuses</span>
                <strong>{formatAmount(totals.bonuses)}</strong>
              </article>
            </div>
            <section className="panel">
              <h2>Admin notes</h2>
              <NoteItems notes={notes} onChange={() => loadDetail(selectedCode, month, year)} />
              <AdminNoteForm target={{ th: selectedCode }} onCreated={() => loadDetail(selectedCode, month, year)} />
            </section>
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
                          <td data-label="Session"><SessionLink code={session.session_code} /></td>
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
            {addingEntry || editingEntry ? (
              <form className="panel" onSubmit={saveEntry}>
                <div className="section-head">
                  <h2>{editingEntry ? "Update payin or payout" : "Add payin or payout"}</h2>
                  <button type="button" className="ghost" onClick={closeEntryForm}>Close</button>
                </div>
                <label>
                  Description
                  <input value={entryDescription} onChange={(event) => setEntryDescription(event.target.value)} required />
                </label>
                <label>
                  Amount
                  <input inputMode="decimal" value={entryAmount} onChange={(event) => setEntryAmount(event.target.value)} required />
                </label>
                <label>
                  Type
                  <select value={entryType} onChange={(event) => setEntryType(event.target.value)}>
                    <option value="payin">Payin</option>
                    <option value="payout">Payout</option>
                  </select>
                </label>
                <div className="form-actions">
                  <button type="submit">{editingEntry ? "Update" : "Create"}</button>
                  <button type="button" className="ghost" onClick={closeEntryForm}>Close</button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={openAddEntry}>Add</button>
            )}
            <section className="panel">
              <h2>Payins</h2>
              <MoneyList entries={payins} empty="No payins." onUpdate={openUpdateEntry} onDelete={deleteEntry} />
            </section>
            <section className="panel">
              <h2>Payouts</h2>
              <MoneyList entries={payouts} empty="No payouts." onUpdate={openUpdateEntry} onDelete={deleteEntry} />
            </section>
            <section className="panel">
              <h2>Sanctions</h2>
              <SanctionList entries={sanctions} empty="No sanctions." />
            </section>
            <section className="panel">
              <h2>Bonuses</h2>
              <SanctionList entries={bonuses} empty="No bonuses." />
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
                <tr key={therapist.code || therapist.work_name} onClick={() => navigate(`/therapists/${encodeURIComponent(therapist.code)}`)}>
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
            <label>
              New code
              <input value={newCode} onChange={(event) => setNewCode(event.target.value)} />
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

function SanctionList({ entries, empty }) {
  if (!entries.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="therapist-list">
      {entries.map((entry, index) => (
        <li key={`${entry.created_at}-${entry.amount}-${index}`}>
          <span className="therapist-name">{formatAmount(entry.amount)}</span>
          <span>{entry.description || "—"}</span>
          <span>{formatDate(entry.created_at)}</span>
          {entry.non_therapist ? <span>{entry.non_therapist}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function MoneyList({ entries, empty, onUpdate, onDelete }) {
  if (!entries.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id || `${entry.created_at}-${entry.amount}-${index}`}>
              <td data-label="Date">{formatDate(entry.created_at)}</td>
              <td data-label="Amount">{formatAmount(entry.amount)}</td>
              <td data-label="Description">{entry.description || "—"}</td>
              <td className="actions" data-label="Actions">
                {entry.id == null ? null : (
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
