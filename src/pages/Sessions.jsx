import { useEffect, useState } from "react";
import { api, getAdminCode } from "../api";
import { formatCycleLength } from "../format";
import TherapistList from "../components/TherapistList";

export default function Sessions() {
  const [phone, setPhone] = useState("");
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyCode, setBusyCode] = useState("");

  async function load(nextPhone = phone) {
    const query = nextPhone.trim() ? `?phone=${encodeURIComponent(nextPhone.trim())}` : "";
    setSessions(await api(`/admin/sessions${query}`));
  }

  useEffect(() => {
    load("").catch((err) => setError(err.message));
  }, []);

  async function setStatus(session, status) {
    setBusyCode(`${session.session_code}-${status}`);
    setError("");
    setNotice("");
    try {
      await api(`/admin/sessions/${session.session_code}/status`, {
        method: "PATCH",
        body: { tc: getAdminCode(), status }
      });
      setNotice(`${session.session_code} marked ${status}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyCode("");
    }
  }

  async function verifyPayment(session) {
    setBusyCode(`${session.session_code}-verify`);
    setError("");
    setNotice("");
    try {
      await api(`/admin/sessions/${session.session_code}/verify_payment`, {
        method: "PATCH",
        body: { tc: getAdminCode() }
      });
      setNotice(`Payment verified for ${session.session_code}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyCode("");
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Sessions</h1>
        <p>Completed and disputed can only be set with the admin code.</p>
      </header>
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch((err) => setError(err.message));
        }}
      >
        <input
          placeholder="Client phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <button type="submit">Show client</button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setPhone("");
            load("").catch((err) => setError(err.message));
          }}
        >
          All sessions
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Client</th>
              <th>Cycle</th>
              <th>Cycle length</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Therapists</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.session_code}>
                <td data-label="Code">{session.session_code}</td>
                <td data-label="Client">
                  {session.client?.name}
                  <span className="sub">{session.client?.phone}</span>
                </td>
                <td data-label="Cycle">{session.cycle ?? "—"}</td>
                <td data-label="Cycle length">{formatCycleLength(session.cycle_length)}</td>
                <td data-label="Amount">{session.amount}</td>
                <td data-label="Status"><span className={`pill ${session.status}`}>{session.status}</span></td>
                <td data-label="Therapists"><TherapistList therapists={session.session_therapists || []} /></td>
                <td className="actions" data-label="Actions">
                  <button type="button" disabled={busyCode === `${session.session_code}-completed`} onClick={() => setStatus(session, "completed")}>
                    Complete
                  </button>
                  <button type="button" className="warn" disabled={busyCode === `${session.session_code}-disputed`} onClick={() => setStatus(session, "disputed")}>
                    Dispute
                  </button>
                  <button type="button" className="ghost" disabled={busyCode === `${session.session_code}-verify`} onClick={() => verifyPayment(session)}>
                    Verify payment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
