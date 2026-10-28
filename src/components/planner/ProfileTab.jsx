import React, { useState } from "react";
import { Check, Info, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileForm from "./ProfileForm";

export default function ProfileTab({ plan, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan);

  const startEdit = () => {
    setDraft({ ...plan });
    setEditing(true);
  };

  const save = async () => {
    await onSave(draft);
    setEditing(false);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg">Events profile</h2>
          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button size="sm" className="rounded-full" onClick={save} disabled={saving}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {saving ? "Saving…" : "Save details"}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="rounded-full" onClick={startEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit details
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything in this plan is built from these details — change one and ask in chat to re-balance the rest.
        </p>
        <div className="mt-5">
          {editing ? (
            <ProfileForm
              profile={draft}
              onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            />
          ) : (
            <ReadOnlyProfile plan={plan} />
          )}
        </div>
      </div>

      {plan.assumptions?.length ? (
        <div className="rounded-2xl border border-accent/25 bg-accent/6 p-5">
          <h3 className="flex items-center gap-2 font-heading text-base">
            <Info className="h-4 w-4 text-accent" />
            What I assumed
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {plan.assumptions.map((item, index) => (
              <li key={index} className="flex gap-2.5 text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ReadOnlyProfile({ plan }) {
  const rows = [
    ["Celebration", plan.event_type?.replace(/_/g, " ")],
    ["Date", plan.event_date],
    ["Guests", plan.guest_count ? `${plan.guest_count} people` : "To confirm"],
    ["Budget", plan.budget_total ? `${plan.budget_total.toLocaleString("en-IN")} ${plan.currency || "INR"}` : "To confirm"],
    ["Where", plan.location],
    ["Setting", plan.venue_type],
    ["Style", plan.style],
    ["Food & dietary", plan.dietary],
    ["Traditions", plan.cultural_traditions],
    ["Must-haves", plan.must_haves],
    ["Please avoid", plan.exclusions],
    ["Accessibility", plan.accessibility_needs],
  ].filter(([, value]) => value && (Array.isArray(value) ? value.length : true));

  return (
    <dl className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 text-sm capitalize">{Array.isArray(value) ? value.join(", ") : value}</dd>
        </div>
      ))}
    </dl>
  );
}