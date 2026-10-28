import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPE_OPTIONS } from "@/lib/format";

const FIELDS = [
  { key: "title", label: "What we're calling it", type: "text", placeholder: "Priya & Rohan's wedding" },
  { key: "event_date", label: "Date", type: "date" },
  { key: "guest_count", label: "Guests", type: "number", placeholder: "60" },
  { key: "budget_total", label: "Budget", type: "number", placeholder: "200000" },
  { key: "location", label: "Where", type: "text", placeholder: "Jaipur" },
  { key: "venue_type", label: "Setting", type: "text", placeholder: "garden, banquet hall, at home" },
  { key: "style", label: "Style or theme", type: "text", placeholder: "pastel, traditional, unicorn" },
];

const TAGS = [
  { key: "dietary", label: "Food & dietary needs", placeholder: "pure vegetarian, no nuts" },
  { key: "cultural_traditions", label: "Traditions to honour", placeholder: "sangeet, mehendi, haldi" },
  { key: "must_haves", label: "Must-haves", placeholder: "live music, photo booth" },
  { key: "exclusions", label: "Please avoid", placeholder: "alcohol, fireworks" },
  { key: "accessibility_needs", label: "Accessibility needs", placeholder: "step-free venue, hearing loop" },
];

const asTags = (value) => (Array.isArray(value) ? value.join(", ") : "");
const parseTags = (value) => value.split(",").map((t) => t.trim()).filter(Boolean);

export default function ProfileForm({ profile, onChange }) {
  const patch = (key, value) => onChange({ [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <div key={field.key} className={field.key === "title" ? "sm:col-span-2" : ""}>
          <Label htmlFor={field.key} className="text-xs uppercase tracking-wide text-muted-foreground">
            {field.label}
          </Label>
          <Input
            id={field.key}
            className="mt-1.5 rounded-xl"
            type={field.type}
            placeholder={field.placeholder}
            value={profile[field.key] ?? ""}
            onChange={(e) =>
              patch(field.key, field.type === "number" ? Number(e.target.value.replace(/[^0-9]/g, "")) || 0 : e.target.value)
            }
          />
        </div>
      ))}

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type of celebration</Label>
        <Select value={profile.event_type || "other"} onValueChange={(value) => patch("event_type", value)}>
          <SelectTrigger className="mt-1.5 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">City scale (sets price levels)</Label>
        <Select value={profile.city_tier || "unknown"} onValueChange={(value) => patch("city_tier", value)}>
          <SelectTrigger className="mt-1.5 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="metro">Metro city</SelectItem>
            <SelectItem value="large_city">Large city</SelectItem>
            <SelectItem value="small_town">Smaller town</SelectItem>
            <SelectItem value="rural">Village or rural</SelectItem>
            <SelectItem value="unknown">Not sure</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {TAGS.map((tag) => (
        <div key={tag.key} className="sm:col-span-2">
          <Label htmlFor={tag.key} className="text-xs uppercase tracking-wide text-muted-foreground">
            {tag.label}
          </Label>
          <Input
            id={tag.key}
            className="mt-1.5 rounded-xl"
            placeholder={tag.placeholder}
            value={asTags(profile[tag.key])}
            onChange={(e) => patch(tag.key, parseTags(e.target.value))}
          />
        </div>
      ))}
    </div>
  );
}