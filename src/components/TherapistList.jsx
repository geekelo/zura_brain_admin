import { formatAmount, formatRole } from "../format";

export default function TherapistList({ therapists }) {
  if (!therapists.length) return "—";

  return (
    <ul className="therapist-list">
      {therapists.map((link, index) => (
        <li key={`${link.name || "therapist"}-${link.role || "role"}-${index}`}>
          <span><span>{formatRole(link.role)}</span> <span className="therapist-name">{link.name || "—"}</span></span>
          <span>{formatAmount(link.tip_amount)} tip amount</span>
          <span>{formatAmount(link.tip_balance)} tip balance</span>
        </li>
      ))}
    </ul>
  );
}
