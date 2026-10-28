export const EVENT_TYPE_LABELS = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
  anniversary: "Anniversary",
  baby_shower: "Baby shower",
  farewell: "Farewell",
  other: "Celebration",
};

export const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export const EFFORT_LABELS = { low: "Easy to do", medium: "Moderate effort", high: "Takes real work" };

export const CONFIDENCE_LABELS = { low: "Rough guess", medium: "Fair estimate", high: "Well grounded" };

export const PRIORITY_LABELS = { must_have: "Must-have", nice_to_have: "Nice-to-have", skip: "Skipped" };

export const VENDOR_STATUS_OPTIONS = [
  { value: "shortlisted", label: "Shortlisted" },
  { value: "contacted", label: "Contacted" },
  { value: "quote_received", label: "Quote received" },
  { value: "booked", label: "Booked" },
  { value: "paid", label: "Paid" },
  { value: "passed", label: "Not going ahead" },
];

export const TASK_STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function formatMoney(amount, currency = "INR") {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch (e) {
    return `${Math.round(n).toLocaleString("en-IN")}`;
  }
}

export function formatRange(low, high, currency = "INR") {
  const lo = Number(low) || 0;
  const hi = Number(high) || 0;
  if (!lo && !hi) return "Not estimated yet";
  if (lo === hi) return formatMoney(lo, currency);
  return `${formatMoney(lo, currency)} – ${formatMoney(hi, currency)}`;
}

export function midOf(item) {
  const lo = Number(item && item.estimate_low) || 0;
  const hi = Number(item && item.estimate_high) || 0;
  return (lo + hi) / 2;
}

export function formatDate(iso) {
  if (!iso) return "Date to confirm";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function countdownLabel(iso) {
  const days = daysUntil(iso);
  if (days === null) return "Date to confirm";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days < 45) return `${days} days to go`;
  return `${Math.round(days / 30)} months to go`;
}

export function dueLabel(iso) {
  const days = daysUntil(iso);
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 14) return `Due in ${days} days`;
  return `Due ${formatDate(iso)}`;
}

export function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}