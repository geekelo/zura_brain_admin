import { useState } from "react";
import { api, getAdminCode } from "../api";

export default function AdminNoteForm({ target, onCreated }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/admin_notes", {
        method: "POST",
        body: {
          tc: getAdminCode(),
          ...target,
          admin_note: { body, status: "unresolved" }
        }
      });
      setBody("");
      if (onCreated) await onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error ? <p className="error">{error}</p> : null}
      <label>
        Admin note
        <textarea value={body} onChange={(event) => setBody(event.target.value)} required />
      </label>
      <button type="submit" disabled={busy}>{busy ? "Saving…" : "Add note"}</button>
    </form>
  );
}
