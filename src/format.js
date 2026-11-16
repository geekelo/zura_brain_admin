const NUMBERED_LENGTHS = new Set(["1", "2", "3", "4"]);

export function formatCycleLength(value) {
  if (value == null || value === "") return "—";
  const text = String(value);
  if (text === "bonus") return "bonus";
  if (NUMBERED_LENGTHS.has(text)) return `${text}/4`;
  return text;
}

export function formatAmount(value) {
  if (value == null || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatRole(role) {
  if (!role) return "—";
  const text = String(role);
  if (text === "frontdesk") return "Front desk";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatYesNo(value) {
  if (value == null || value === "") return "—";
  return value ? "Yes" : "No";
}

export function formatDuration(seconds) {
  const total = Number(seconds);
  if (!total) return "—";
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  if (!remain) return `${minutes} min`;
  return `${minutes} min ${remain} sec`;
}

export function formatStatus(status) {
  const labels = {
    pending: "Pending",
    started: "Started",
    ended: "Ended",
    completed: "Completed",
    disputed: "Disputed"
  };
  return labels[status] || status || "—";
}

export function formatTime(value) {
  if (!value) return "—";
  const match = String(value).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(value);
}
