import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Download, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_LABELS, countdownLabel, formatDate, formatMoney } from "@/lib/format";

export default function PlanHeader({ plan, onExport, exporting }) {
  return (
    <div className="relative border-b border-border/60 bg-card/70 px-5 py-5 sm:px-7">
      <span className="kantha-border absolute inset-x-0 top-0 h-1" />
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All plans
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
              {EVENT_TYPE_LABELS[plan.event_type] || "Celebration"}
            </span>
            <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-medium text-accent">
              {countdownLabel(plan.event_date)}
            </span>
          </div>
          <h1 className="mt-2.5 font-heading text-2xl leading-tight text-balance sm:text-3xl">{plan.title}</h1>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDate(plan.event_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {plan.guest_count ? `${plan.guest_count} guests` : "Guests to confirm"}
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              {formatMoney(plan.budget_total, plan.currency)}
            </span>
            {plan.location ? <span>{plan.location}</span> : null}
          </div>
        </div>
        <Button variant="outline" className="rounded-full" onClick={onExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Building PDF…" : "Export PDF"}
        </Button>
      </div>
    </div>
  );
}