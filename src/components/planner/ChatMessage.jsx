import React from "react";
import { Check, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

export default function ChatMessage({ message, onConfirm, onDiscard, applying }) {
  const isUser = message.role === "user";
  let payload = null;
  try {
    payload = message.payload ? JSON.parse(message.payload) : null;
  } catch (e) {
    payload = null;
  }

  const hasChanges =
    payload?.changed &&
    ((payload.diff?.length || 0) > 0 ||
      (payload.create_tasks?.length || 0) > 0 ||
      (payload.new_ideas?.length || 0) > 0 ||
      Object.keys(payload.profile_updates || {}).length > 0 ||
      (payload.task_updates?.length || 0) > 0);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="rounded-2xl rounded-tl-sm border border-border/80 bg-card px-4 py-2.5 text-sm leading-relaxed">
          {message.content}
        </div>

        {hasChanges ? (
          <div className="rounded-2xl border border-primary/25 bg-secondary/50 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Wand2 className="h-3.5 w-3.5" />
              {payload.applied === "confirmed" ? "Applied" : payload.applied === "discarded" ? "Discarded" : "Proposed change"}
            </p>

            {payload.diff?.length ? (
              <ul className="mt-2.5 space-y-1.5 text-sm">
                {payload.diff.slice(0, 8).map((row) => (
                  <li key={row.category} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate capitalize">{row.label}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="text-muted-foreground">{formatMoney(row.from)}</span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span className="font-medium">{formatMoney(row.to)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {payload.total_from !== payload.total_to ? (
              <p className="mt-2.5 border-t border-border/70 pt-2.5 text-sm">
                <span className="text-muted-foreground">Total budget </span>
                <span className="tabular-nums">
                  {formatMoney(payload.total_from)} → <span className="font-medium">{formatMoney(payload.total_to)}</span>
                </span>
              </p>
            ) : null}

            <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground">
              {payload.create_tasks?.length ? <li>Adds {payload.create_tasks.length} task(s) to the timeline</li> : null}
              {payload.task_updates?.length ? <li>Updates {payload.task_updates.length} task(s)</li> : null}
              {payload.new_ideas?.length ? <li>Adds {payload.new_ideas.length} new idea(s) to the ideas tab</li> : null}
              {Object.keys(payload.profile_updates || {}).length ? (
                <li>
                  Updates your details:{" "}
                  {Object.entries(payload.profile_updates)
                    .map(([key, value]) => `${key.replace(/_/g, " ")} → ${Array.isArray(value) ? value.join(", ") : value}`)
                    .join("; ")}
                </li>
              ) : null}
            </ul>

            {!payload.applied ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="rounded-full" onClick={() => onConfirm(message)} disabled={applying}>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Confirm change
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onDiscard(message)} disabled={applying}>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Leave it
                </Button>
              </div>
            ) : (
              <p className="mt-2.5 text-xs text-muted-foreground">
                {payload.applied === "confirmed" ? "Done — your plan reflects this." : "Left unchanged."}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}