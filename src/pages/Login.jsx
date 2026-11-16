import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAdminCode, verifyAdminCode } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifyAdminCode(code.trim());
      setAdminCode(code.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Admin code was rejected");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form onSubmit={submit}>
        <p className="eyebrow">Zura Brain</p>
        <h1>Admin dashboard</h1>
        <label>
          Admin code
          <input
            autoFocus
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
