import { Link } from "react-router-dom";

export function SessionLink({ code }) {
  if (!code) return "—";
  return <Link className="record-link" to={`/sessions/${encodeURIComponent(code)}`}>{code}</Link>;
}

export function TherapistLink({ code, name, label }) {
  const text = label || name || code;
  if (!text) return "—";
  const to = code
    ? `/therapists/${encodeURIComponent(code)}`
    : `/therapists?name=${encodeURIComponent(name)}`;
  return <Link className="record-link" to={to} onClick={(event) => event.stopPropagation()}>{text}</Link>;
}

export function ClientLink({ phone, name, label }) {
  const text = label || [name, phone].filter(Boolean).join(" · ") || name || phone;
  if (!text) return "—";
  const to = phone
    ? `/clients?phone=${encodeURIComponent(phone)}`
    : `/clients?name=${encodeURIComponent(name)}`;
  return <Link className="record-link" to={to} onClick={(event) => event.stopPropagation()}>{text}</Link>;
}
