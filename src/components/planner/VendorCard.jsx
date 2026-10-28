import React, { useState } from "react";
import { ChevronDown, Flag, ShieldAlert, Sparkle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VENDOR_STATUS_OPTIONS } from "@/lib/format";

export default function VendorCard({ vendor, onPatch }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium capitalize">{vendor.vendor_type}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                vendor.essential ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {vendor.essential ? "essential" : "optional"}
            </span>
          </div>
          {vendor.why ? <p className="mt-1.5 text-sm text-muted-foreground">{vendor.why}</p> : null}
        </div>
        <Select value={vendor.status || "shortlisted"} onValueChange={(value) => onPatch(vendor.id, { status: value })}>
          <SelectTrigger className="h-8 w-[168px] rounded-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VENDOR_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Name</p>
          <Input
            className="mt-1 h-9 rounded-xl text-sm"
            placeholder="Who are you talking to?"
            defaultValue={vendor.name || ""}
            onBlur={(e) => onPatch(vendor.id, { name: e.target.value })}
          />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contact</p>
          <Input
            className="mt-1 h-9 rounded-xl text-sm"
            placeholder="Phone or email"
            defaultValue={vendor.contact || ""}
            onBlur={(e) => onPatch(vendor.id, { contact: e.target.value })}
          />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quote</p>
          <Input
            type="number"
            className="mt-1 h-9 rounded-xl text-sm"
            placeholder="Amount quoted"
            defaultValue={vendor.quote_amount ?? ""}
            onBlur={(e) => onPatch(vendor.id, { quote_amount: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm text-secondary-foreground transition-colors hover:bg-secondary"
      >
        Questions to ask, contract checks and red flags
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Bullets icon={Sparkle} title="Ask them" items={vendor.questions} />
          <Bullets icon={Flag} title="In the contract" items={vendor.contract_checks} />
          <Bullets icon={ShieldAlert} title="Walk away if" items={vendor.red_flags} tone="danger" />
          <div className="sm:col-span-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
            <Textarea
              className="mt-1 rounded-xl text-sm"
              rows={2}
              placeholder="What they said, what you agreed"
              defaultValue={vendor.notes || ""}
              onBlur={(e) => onPatch(vendor.id, { notes: e.target.value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Bullets({ icon: Icon, title, items, tone }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide ${tone === "danger" ? "text-destructive" : "text-muted-foreground"}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <ul className="mt-1.5 space-y-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}