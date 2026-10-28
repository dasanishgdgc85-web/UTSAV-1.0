import React from "react";
import { Loader2, TrendingUp, TriangleAlert } from "lucide-react";
import BudgetRow from "./BudgetRow";
import { formatMoney, midOf } from "@/lib/format";

export default function BudgetTab({ plan, items, onPatch, busy }) {
  const currency = plan.currency || "INR";
  const total = plan.budget_total || 0;
  const planned = Math.round(items.reduce((sum, item) => sum + midOf(item), 0));
  const quoted = items.reduce((sum, item) => sum + (Number(item.quoted) || 0), 0);
  const actual = items.reduce((sum, item) => sum + (Number(item.actual) || 0), 0);
  const remaining = total - actual;
  const sorted = items.slice().sort((a, b) => midOf(b) - midOf(a));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Planned against your budget</p>
            <p className="mt-1 font-heading text-2xl tabular-nums">
              {formatMoney(planned, currency)}
              <span className="ml-2 text-base text-muted-foreground">of {formatMoney(total, currency)}</span>
            </p>
          </div>
          {busy ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Re-balancing…
            </span>
          ) : null}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${total ? Math.min(100, (planned / total) * 100) : 0}%` }}
          />
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <Stat label="Quoted by vendors" value={formatMoney(quoted, currency)} />
          <Stat label="Actually paid" value={formatMoney(actual, currency)} />
          <Stat
            label="Left to spend"
            value={formatMoney(remaining, currency)}
            tone={remaining < 0 ? "danger" : "ok"}
          />
        </div>
        {remaining < 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <TriangleAlert className="h-4 w-4" />
            You have spent {formatMoney(Math.abs(remaining), currency)} more than the plan. Ask in chat what to trim.
          </p>
        ) : null}
      </div>

      <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        Protect a line to keep it fixed, mark something skipped to release its money, and protected or changed lines stay put when the plan re-balances.
      </p>

      <div className="space-y-3">
        {sorted.map((item) => (
          <BudgetRow
            key={item.id}
            item={item}
            currency={currency}
            busy={busy}
            onPatch={onPatch}
          />
        ))}
      </div>

      {!items.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No budget yet — ask in chat to build one.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3.5 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 tabular-nums ${tone === "danger" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}