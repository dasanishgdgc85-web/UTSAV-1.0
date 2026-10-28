// Deterministic planning engine: all money and date arithmetic lives here,
// never in the language model. Shared by every planner backend function.

const STEP = 100;
const RANGE = 0.12;
const CONTINGENCY = 0.1;

export function roundTo(n, step = STEP) {
  const v = Number(n) || 0;
  return Math.round(v / step) * step;
}

export function midOf(item) {
  const lo = Number(item && item.estimate_low) || 0;
  const hi = Number(item && item.estimate_high) || 0;
  return (lo + hi) / 2;
}

function banded(item, target) {
  const mid = Math.max(0, roundTo(target));
  const spread = roundTo(mid * RANGE);
  return { ...item, estimate_low: Math.max(0, mid - spread), estimate_high: mid + spread };
}

// Category midpoints always add up to exactly `total`, locked and protected
// categories hold their value, and the contingency line absorbs rounding.
export function normalizeBudget(rawItems, total, protect = []) {
  const items = (rawItems || []).map((i) => ({ ...i }));
  const budget = Math.max(0, Number(total) || 0);

  if (!items.some((i) => i.category === "contingency")) {
    items.push({
      category: "contingency",
      label: "Contingency buffer",
      priority: "must_have",
      rationale: `A ${Math.round(CONTINGENCY * 100)}% buffer so price changes, extras and rounding never break the plan.`,
      confidence: "high",
      hidden_cost_note: "Keep this even if the budget feels tight.",
    });
  }

  const cIdx = items.findIndex((i) => i.category === "contingency");
  const mids = items.map(midOf);
  const isFixed = (idx) =>
    idx !== cIdx && (items[idx].locked === true || items[idx].priority === "skip" || protect.includes(items[idx].category));

  const fixedSum = items.reduce((sum, _item, idx) => (isFixed(idx) ? sum + mids[idx] : sum), 0);
  const flexIdx = items.map((_item, idx) => idx).filter((idx) => idx !== cIdx && !isFixed(idx));
  const weights = flexIdx.map((idx) => (mids[idx] > 0 ? mids[idx] : 1));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const targetNonContingency = budget / (1 + CONTINGENCY);
  const pool = Math.max(0, targetNonContingency - fixedSum);

  flexIdx.forEach((idx, k) => {
    mids[idx] = flexIdx.length ? Math.max(0, roundTo((pool * weights[k]) / weightSum)) : 0;
  });

  const othersSum = () => items.reduce((sum, _item, idx) => (idx === cIdx ? sum : sum + mids[idx]), 0);
  mids[cIdx] = roundTo(budget - othersSum());

  if (mids[cIdx] < 0) {
    const excess = -mids[cIdx];
    const flexSum = flexIdx.reduce((sum, idx) => sum + mids[idx], 0);
    flexIdx.forEach((idx) => {
      mids[idx] = flexSum > 0 ? Math.max(0, roundTo(mids[idx] - excess * (mids[idx] / flexSum))) : 0;
    });
    mids[cIdx] = Math.max(0, roundTo(budget - othersSum()));
  }

  return items.map((item, idx) => banded(item, mids[idx]));
}

export function totalOf(items) {
  return Math.round((items || []).reduce((sum, item) => sum + midOf(item), 0));
}

const DAY = 86400000;

export function daysBetween(fromISO, toISO) {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / DAY);
}

// Back-plans tasks from the event date. When the lead time is shorter than the
// plan needs, the timeline compresses and long-lead work is flagged at risk.
export function buildTimeline(rawTasks, eventDateISO, todayISO) {
  const event = new Date(`${eventDateISO}T00:00:00`);
  const today = new Date(`${todayISO}T00:00:00`);
  const leadDays = Math.max(0, daysBetween(todayISO, eventDateISO));
  const maxOffset = (rawTasks || []).reduce((max, t) => Math.max(max, Number(t.offset_days) || 0), 0);
  const factor = maxOffset > leadDays && maxOffset > 0 ? leadDays / maxOffset : 1;

  return (rawTasks || []).map((task) => {
    const original = Math.max(0, Number(task.offset_days) || 0);
    const offset = Math.max(0, Math.round(original * factor));
    const due = new Date(event.getTime() - offset * DAY);
    const due_date = due.toISOString().slice(0, 10);
    const daysUntilDue = daysBetween(todayISO, due_date);
    const compressed = factor < 1 && offset < original;
    const longLead = original >= 45;
    const atRisk = daysUntilDue < 0 || (compressed && (longLead ? daysUntilDue <= 21 : daysUntilDue <= 7));
    return {
      ...task,
      offset_days: offset,
      due_date,
      status: task.status || "todo",
      is_at_risk: !!atRisk,
      risk_note: atRisk
        ? `Only ${Math.max(daysUntilDue, 0)} days left for work that normally starts earlier. Move first, or pick a simpler option.`
        : "",
    };
  });
}