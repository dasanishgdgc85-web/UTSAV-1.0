import React, { useState } from "react";
import { Lightbulb } from "lucide-react";
import IdeaCard from "./IdeaCard";

export default function IdeasTab({ ideas, currency, onReact, onAdd, busy }) {
  const [onlyLiked, setOnlyLiked] = useState(false);
  const liked = ideas.filter((i) => i.liked).length;
  const visible = ideas.filter((i) => (onlyLiked ? i.liked : !i.disliked));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-5 py-4">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4 text-primary" />
          {ideas.length} ideas built for this event. Love what fits and it sharpens the next suggestions.
        </div>
        {liked ? (
          <button
            type="button"
            onClick={() => setOnlyLiked((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              onlyLiked ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {onlyLiked ? "Showing loved ideas" : "Show loved only"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            currency={currency}
            onReact={onReact}
            onAdd={onAdd}
            busy={busy}
          />
        ))}
      </div>

      {!ideas.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No ideas yet — ask in chat: “give me three ideas for the entrance”.
        </p>
      ) : null}
      {ideas.length > 0 && visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing loved yet — tap “Love it” on the ones you like.
        </p>
      ) : null}
    </div>
  );
}