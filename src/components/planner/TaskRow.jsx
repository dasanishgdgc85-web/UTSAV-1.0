import React from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EFFORT_LABELS, TASK_STATUS_OPTIONS, dueLabel } from "@/lib/format";

export default function TaskRow({ task, onStatus }) {
  const done = task.status === "done";

  return (
    <div className="flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/50">
      <button
        type="button"
        aria-label={done ? "Mark as not done" : "Mark as done"}
        onClick={() => onStatus(task, done ? "todo" : "done")}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
        }`}
      >
        {done ? <Check className="h-3 w-3" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm ${done ? "text-muted-foreground line-through" : "font-medium"}`}>{task.title}</p>
          {task.is_at_risk && !done ? (
            <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
              <TriangleAlert className="h-3 w-3" />
              at risk
            </span>
          ) : null}
        </div>
        {task.description ? <p className="mt-1 text-xs text-muted-foreground">{task.description}</p> : null}
        {task.is_at_risk && task.risk_note && !done ? (
          <p className="mt-1 text-xs text-destructive">{task.risk_note}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{dueLabel(task.due_date)}</span>
          <span>{task.owner || "You"}</span>
          <span>{EFFORT_LABELS[task.effort] || "Moderate effort"}</span>
        </div>
      </div>

      <Select value={task.status || "todo"} onValueChange={(value) => onStatus(task, value)}>
        <SelectTrigger className="h-8 w-[126px] shrink-0 rounded-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}