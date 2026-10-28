import React from "react";
import { HelpCircle, Lock, LockOpen, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CONFIDENCE_LABELS, PRIORITY_LABELS, formatMoney, formatRange, midOf } from "@/lib/format";

export default function BudgetRow({ item, currency, onPatch, busy }) {
  const mid = midOf(item);
  const quoted = Number(item.quoted) || 0;
  const actual = Number(item.actual) || 0;
  const overspend = actual > mid && mid > 0;

  const update = (patch) => onPatch(item.id, patch);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 transition-shadow hover:shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{item.label}</h3>
            {item.locked ? (
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                <Lock className="h-3 w-3" /> protected
              </span>
            ) : null}
            {item.priority === "skip" ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                skipped
              </span>
            ) : null}
          </div>
          {item.rationale ? <p className="mt-1.5 text-sm text-muted-foreground">{item.rationale}</p> : null}
          {item.hidden_cost_note ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-accent">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {item.hidden_cost_note}
            </p>
          ) : null}
        </div>

        <div className="text-right">
          <p className="font-heading text-lg tabular-nums">{formatMoney(mid, currency)}</p>
          <p className="text-xs tabular-nums text-muted-foreground">{formatRange(item.estimate_low, item.estimate_high, currency)}</p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        <Select value={item.priority || "must_have"} onValueChange={(value) => update({ priority: value })} disabled={busy}>
          <SelectTrigger className="h-8 w-[150px] rounded-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => update({ locked: !item.locked })}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
        >
          {item.locked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {item.locked ? "Unprotect" : "Protect"}
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Why this?
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 text-sm">
            <p className="font-medium">How this number was set</p>
            <p className="mt-1.5 text-muted-foreground">{item.rationale || "Set from typical costs for this kind of event."}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
              Confidence: {CONFIDENCE_LABELS[item.confidence] || "Fair estimate"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Always an estimate — confirm the real price with your vendor before you commit.
            </p>
          </PopoverContent>
        </Popover>

          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Quoted</span>
            <Input
              type="number"
              className="h-8 w-24 rounded-full text-xs"
              defaultValue={item.quoted ?? ""}
              placeholder="—"
              onBlur={(e) => update({ quoted: Number(e.target.value) || 0 })}
            />
            <span className="hidden sm:inline">Paid</span>
            <Input
              type="number"
              className="h-8 w-24 rounded-full text-xs"
              defaultValue={item.actual ?? ""}
              placeholder="—"
              onBlur={(e) => update({ actual: Number(e.target.value) || 0 })}
            />
          </span>
      </div>

      {quoted || actual ? (
        <p className={`mt-2 text-xs ${overspend ? "text-destructive" : "text-muted-foreground"}`}>
          {quoted ? `Quoted ${formatMoney(quoted, currency)}` : "No quote yet"}
          {actual ? ` · Paid ${formatMoney(actual, currency)}` : ""}
          {overspend ? ` · ${formatMoney(actual - mid, currency)} over estimate` : ""}
        </p>
      ) : null}
    </div>
  );
}