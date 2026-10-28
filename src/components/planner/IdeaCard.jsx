import React from "react";
import { Check, Heart, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EFFORT_LABELS, formatMoney } from "@/lib/format";

export default function IdeaCard({ idea, currency, onReact, onAdd, busy }) {
  return (
    <div className={`flex flex-col rounded-2xl border bg-card p-4 ${idea.liked ? "border-accent/40" : "border-border/80"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
          {idea.category}
        </span>
        {idea.added ? (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            <Check className="h-3 w-3" /> in plan
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 font-heading text-lg leading-snug">{idea.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{idea.description}</p>
      {idea.safety_note ? <p className="mt-2 text-xs text-destructive">{idea.safety_note}</p> : null}

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {idea.estimated_cost ? `about ${formatMoney(idea.estimated_cost, currency)}` : "cost to be quoted"}
        </span>
        <span>{EFFORT_LABELS[idea.effort] || "Moderate effort"}</span>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3.5">
        <button
          type="button"
          onClick={() => onReact(idea, { liked: !idea.liked, disliked: false })}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
            idea.liked ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${idea.liked ? "fill-current" : ""}`} />
          Love it
        </button>
        <button
          type="button"
          onClick={() => onReact(idea, { disliked: !idea.disliked, liked: false })}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
            idea.disliked ? "border-border bg-secondary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <X className="h-3.5 w-3.5" />
          Not for us
        </button>
        <Button
          size="sm"
          className="ml-auto rounded-full"
          disabled={busy || idea.added}
          onClick={() => onAdd(idea)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {idea.added ? "Added" : "Add to plan"}
        </Button>
      </div>
    </div>
  );
}