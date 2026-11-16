import { useEffect, useState } from "react";
import { api, getAdminCode } from "../api";
import ClientSessions from "../components/ClientSessions";
import { formatCycleLength, formatDate } from "../format";

const emptyForm = {
  name: "",
  phone: "",
  sex: "",
  adult: false,
  cycle: "",
  cycle_length: "",
  other_phones: ""
};

const CYCLE_LENGTHS = ["1", "2", "3", "4", "bonus"];

export default function Clients() {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [sessions, setSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);

  async function load(term = search) {
    const query = term.trim() ? `?search=${encodeURIComponent(term.trim())}` : "";
    const rows = await api(`/admin/clients${query}`);
    setClients(rows);
    return rows;
  }

  useEffect(() => {
    load("").catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selected?.phone) return undefined;
    let cancelled = false;
    setLoadingDetail(true);
    const phone = selected.phone;
    Promise.all([
      api(`/admin/sessions?phone=${encodeURIComponent(phone)}`),
      api("/admin/admin_notes")
    ])
      .then(([sessionRows, noteRows]) => {
        if (cancelled) return;
        const clientId = sessionRows.find((row) => row.client_id != null)?.client_id;
        setSessions(sessionRows);
        setNotes(
          (Array.isArray(noteRows) ? noteRows : []).filter(
            (note) => clientId != null && note.client_id === clientId
          )
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.phone, reloadKey]);

  function choose(client, { keepNotice = false } = {}) {
    setSelected(client);
    setError("");
    if (!keepNotice) setNotice("");
    setSessions([]);
    setNotes([]);
    setForm(formFromClient(client));
    setEditing(false);
    setReloadKey((key) => key + 1);
  }

  function openEdit() {
    setForm(formFromClient(selected));
    setError("");
    setEditing(true);
  }

  function closeEdit() {
    setForm(formFromClient(selected));
    setEditing(false);
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/admin/clients/record", {
        method: "PATCH",
        body: {
          phone: selected.phone,
          tc: getAdminCode(),
          client: {
            name: form.name,
            phone: form.phone,
            sex: form.sex,
            adult: form.adult,
            cycle: form.cycle === "" ? null : Number(form.cycle),
            cycle_length: form.cycle_length,
            other_phones: form.other_phones.split(",").map((phone) => phone.trim()).filter(Boolean)
          }
        }
      });
      const rows = await load();
      const updated = rows.find((client) => client.phone === form.phone);
      setNotice("Client saved.");
      if (updated) choose(updated, { keepNotice: true });
      else setSelected((current) => ({ ...current, ...form, phone: form.phone }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshAfterSessionEdit() {
    const rows = await load();
    setSelected((current) => rows.find((client) => client.phone === current?.phone) || current);
    setReloadKey((key) => key + 1);
  }

  const lengthOptions = CYCLE_LENGTHS.includes(form.cycle_length) || form.cycle_length === ""
    ? CYCLE_LENGTHS
    : [form.cycle_length, ...CYCLE_LENGTHS];

  if (selected) {
    const otherPhones = Array.isArray(selected.other_phones) ? selected.other_phones : [];
    return (
      <section className="detail">
        <header className="page-head">
          <button type="button" className="ghost" onClick={() => setSelected(null)}>Back to clients</button>
          <h1>{selected.name || "Client"}</h1>
          <p>{selected.phone}</p>
        </header>
        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className="notice">{notice}</p> : null}
        <div className="cards">
          <article><span>Total</span><strong>{selected.total_sessions ?? 0}</strong></article>
          <article><span>Pending</span><strong>{selected.pending_sessions ?? 0}</strong></article>
          <article><span>Started</span><strong>{selected.ongoing_sessions ?? 0}</strong></article>
          <article><span>Completed</span><strong>{selected.completed_sessions ?? 0}</strong></article>
          <article><span>Disputed</span><strong>{selected.disputed_sessions ?? 0}</strong></article>
        </div>

        <section className="panel">
          <div className="section-head">
            <h2>Client details</h2>
            {editing ? null : (
              <button type="button" className="ghost" onClick={openEdit}>Edit</button>
            )}
          </div>
          <dl className="facts">
            <div>
              <dt>Phone</dt>
              <dd>{selected.phone || "—"}</dd>
            </div>
            <div>
              <dt>Other phones</dt>
              <dd>{otherPhones.length ? otherPhones.join(", ") : "—"}</dd>
            </div>
            <div>
              <dt>Sex</dt>
              <dd>{selected.sex || "—"}</dd>
            </div>
            <div>
              <dt>Adult</dt>
              <dd>{selected.adult ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Cycle</dt>
              <dd>{selected.cycle ?? "—"}</dd>
            </div>
            <div>
              <dt>Cycle length</dt>
              <dd>{formatCycleLength(selected.cycle_length)}</dd>
            </div>
            <div>
              <dt>Created by</dt>
              <dd>{selected.created_by || "—"}</dd>
            </div>
          </dl>
          {editing ? (
          <form className="edit-form" onSubmit={save}>
            <div className="section-head">
              <h3>Edit details</h3>
              <button type="button" className="ghost" onClick={closeEdit}>Close</button>
            </div>
            <label>
              Name
              <input name="name" value={form.name} onChange={updateField} required />
            </label>
            <label>
              Phone
              <input name="phone" value={form.phone} onChange={updateField} required />
            </label>
            <label>
              Sex
              <input name="sex" value={form.sex} onChange={updateField} />
            </label>
            <label>
              Cycle
              <input name="cycle" type="number" value={form.cycle} onChange={updateField} />
            </label>
            <label>
              Cycle length
              <select name="cycle_length" value={form.cycle_length} onChange={updateField}>
                <option value="">—</option>
                {lengthOptions.map((length) => (
                  <option key={length} value={length}>{formatCycleLength(length)}</option>
                ))}
              </select>
            </label>
            <label>
              Other phones
              <input name="other_phones" value={form.other_phones} onChange={updateField} placeholder="Comma separated" />
            </label>
            <label className="check">
              <input name="adult" type="checkbox" checked={form.adult} onChange={updateField} />
              Adult
            </label>
            <div className="form-actions">
              <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save client"}</button>
              <button type="button" className="ghost" onClick={closeEdit} disabled={busy}>Close</button>
            </div>
          </form>
          ) : null}
        </section>

        <section className="panel">
          <h2>Preferences</h2>
          <p className={selected.client_preferences ? "preserve" : "muted"}>
            {selected.client_preferences || "No preferences yet."}
          </p>
        </section>

        <section className="panel">
          <h2>Admin notes</h2>
          {loadingDetail && notes.length === 0 ? <p className="muted">Loading notes…</p> : null}
          {!loadingDetail && notes.length === 0 ? <p className="muted">No admin notes.</p> : null}
          <div className="note-list">
            {notes.map((note, index) => (
              <article key={`${note.created_at || "note"}-${index}`} className="note">
                <div className="section-head">
                  <span>{formatDate(note.created_at)}</span>
                  {note.status ? <span className="pill">{note.status}</span> : null}
                </div>
                <p className="preserve">{note.body || "—"}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2>Sessions</h2>
          {loadingDetail && sessions.length === 0 ? <p className="muted">Loading sessions…</p> : (
            <ClientSessions sessions={sessions} onUpdated={refreshAfterSessionEdit} />
          )}
        </section>
      </section>
    );
  }

  return (
    <section>
      <header className="page-head">
        <h1>Clients</h1>
        <p>Select a client to see details, preferences, notes, and sessions.</p>
      </header>
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch((err) => setError(err.message));
        }}
      >
        <input
          placeholder="Search name or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Cycle</th>
              <th>Cycle length</th>
              <th>Total</th>
              <th>Pending</th>
              <th>Started</th>
              <th>Completed</th>
              <th>Disputed</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.phone} onClick={() => choose(client)}>
                <td data-label="Name">{client.name}</td>
                <td data-label="Phone">{client.phone}</td>
                <td data-label="Cycle">{client.cycle ?? "—"}</td>
                <td data-label="Cycle length">{formatCycleLength(client.cycle_length)}</td>
                <td data-label="Total">{client.total_sessions}</td>
                <td data-label="Pending">{client.pending_sessions}</td>
                <td data-label="Started">{client.ongoing_sessions}</td>
                <td data-label="Completed">{client.completed_sessions}</td>
                <td data-label="Disputed">{client.disputed_sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formFromClient(client) {
  return {
    name: client.name || "",
    phone: client.phone || "",
    sex: client.sex || "",
    adult: Boolean(client.adult),
    cycle: client.cycle ?? "",
    cycle_length: client.cycle_length || "",
    other_phones: Array.isArray(client.other_phones) ? client.other_phones.join(", ") : ""
  };
}
