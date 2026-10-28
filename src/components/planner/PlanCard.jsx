import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Users } from "lucide-react";
import { EVENT_TYPE_LABELS, countdownLabel, formatDate, formatMoney } from "@/lib/format";

export default function PlanCard({ plan, stats }) {
  const total = stats?.total || 0;
  const done = stats?.done || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <Link
      to={`/plan/${plan.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft"
    >
      <span className="kantha-border absolute inset-x-0 top-0 h-1" />
      <div className="mt-1 flex items-start justify-between gap-3">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
          {EVENT_TYPE_LABELS[plan.event_type] || "Celebration"}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <h3 className="mt-3 font-heading text-xl leading-snug text-balance">{plan.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{countdownLabel(plan.event_date)}</p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(plan.event_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {plan.guest_count ? `${plan.guest_count} guests` : "Guests to confirm"}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-heading text-lg">{formatMoney(plan.budget_total, plan.currency)}</p>
          <p className="text-xs text-muted-foreground">planned budget</p>
        </div>
        <div className="text-right">
          <p className="text-sm tabular-nums text-muted-foreground">
            {done}/{total} tasks
          </p>
          <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}