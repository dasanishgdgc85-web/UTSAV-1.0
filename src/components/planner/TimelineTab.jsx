import React, { useState } from "react";
import { CircleAlert, ListChecks } from "lucide-react";
import TaskRow from "./TaskRow";

export default function TimelineTab({ tasks, onStatus }) {
  const [onlyRisk, setOnlyRisk] = useState(false);

  const visible = onlyRisk ? tasks.filter((t) => t.is_at_risk && t.status !== "done") : tasks;
  const phases = [];
  visible.forEach((task) => {
    const key = task.phase || "To schedule";
    const found = phases.find((p) => p.key === key);
    if (found) found.items.push(task);
    else phases.push({ key, items: [task] });
  });
  phases.forEach((phase) =>
    phase.items.sort((a, b) => (b.offset_days || 0) - (a.offset_days || 0))
  );
  phases.sort(
    (a, b) =>
      Math.max(...b.items.map((t) => t.offset_days || 0)) - Math.max(...a.items.map((t) => t.offset_days || 0))
  );

  const done = tasks.filter((t) => t.status === "done").length;
  const atRisk = tasks.filter((t) => t.is_at_risk && t.status !== "done").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-5 py-4">
        <div className="flex items-center gap-2.5 text-sm">
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="tabular-nums">
            {done} of {tasks.length} done
          </span>
          {atRisk ? (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
              <CircleAlert className="h-3.5 w-3.5" />
              {atRisk} need attention now
            </span>
          ) : null}
        </div>
        {atRisk ? (
          <button
            type="button"
            onClick={() => setOnlyRisk((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              onlyRisk ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {onlyRisk ? "Showing at-risk only" : "Show at-risk only"}
          </button>
        ) : null}
      </div>

      {phases.map((phase) => (
        <div key={phase.key} className="rounded-2xl border border-border/80 bg-card p-4">
          <h3 className="px-2 pb-1 pt-1 font-heading text-base">{phase.key}</h3>
          <div className="mt-1 divide-y divide-border/60">
            {phase.items.map((task) => (
              <TaskRow key={task.id} task={task} onStatus={onStatus} />
            ))}
          </div>
        </div>
      ))}

      {!tasks.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No timeline yet — ask in chat to build one.
        </p>
      ) : null}
      {tasks.length > 0 && visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing is at risk right now.
        </p>
      ) : null}
    </div>
  );
}