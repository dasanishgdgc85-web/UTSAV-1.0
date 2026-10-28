import React, { useState } from "react";
import { Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VendorCard from "./VendorCard";

export default function VendorsTab({ vendors, onPatch, onAdd }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ vendor_type: "", name: "" });

  const essential = vendors.filter((v) => v.essential);
  const optional = vendors.filter((v) => !v.essential);

  const submit = async () => {
    if (!draft.vendor_type.trim()) return;
    await onAdd({ vendor_type: draft.vendor_type.trim(), name: draft.name.trim() });
    setDraft({ vendor_type: "", name: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-5 py-4">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Store className="h-4 w-4 text-primary" />
          Track who you have contacted, what they quoted and where you stand.
        </div>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add a vendor
        </Button>
      </div>

      <Section title="Have to get right" vendors={essential} onPatch={onPatch} />
      <Section title="Worth having" vendors={optional} onPatch={onPatch} />

      {!vendors.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No vendors yet — add one, or ask in chat to build your checklist.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Add a vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">What they do</p>
              <Input
                className="mt-1.5 rounded-xl"
                placeholder="caterer, photographer, tent house"
                value={draft.vendor_type}
                onChange={(e) => setDraft({ ...draft, vendor_type: e.target.value })}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Name (optional)</p>
              <Input
                className="mt-1.5 rounded-xl"
                placeholder="Who you have in mind"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-full" onClick={submit}>
              Add to plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, vendors, onPatch }) {
  if (!vendors.length) return null;
  return (
    <div className="space-y-3">
      <h2 className="px-1 font-heading text-base text-muted-foreground">{title}</h2>
      {vendors.map((vendor) => (
        <VendorCard key={vendor.id} vendor={vendor} onPatch={onPatch} />
      ))}
    </div>
  );
}