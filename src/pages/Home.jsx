const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import AppHeader from "@/components/planner/AppHeader";
import PlanCard from "@/components/planner/PlanCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/lib/AuthContext";

const EXAMPLES = [
  "My sister's engagement party, 60 guests, around ₹2 lakh, vegetarian-friendly, in March",
  "My son's 5th birthday, 30 kids, ₹25,000, in our backyard, superhero theme",
  "Our neighbourhood Diwali festival for 200 people, ₹80,000, on the community ground",
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brief, setBrief] = useState("");
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      try {
        const page = await db.entities.Plan.filter(
          { created_by_id: user.id },
          { sort: "-created_date", limit: 24 }
        );
        const items = page.items || [];
        if (!active) return;
        setPlans(items);

        if (items.length) {
          const ids = items.map((p) => p.id);
          const [all, done] = await Promise.all([
            db.entities.Task.aggregate({ query: { plan_id: { $in: ids } }, groupBy: "plan_id" }).catch(() => null),
            db.entities.Task.aggregate({ query: { plan_id: { $in: ids }, status: "done" }, groupBy: "plan_id" }).catch(() => null),
          ]);
          const map = {};
          (all?.rows || []).forEach((row) => {
            map[row.plan_id] = { total: row.count, done: 0 };
          });
          (done?.rows || []).forEach((row) => {
            if (map[row.plan_id]) map[row.plan_id].done = row.count;
          });
          if (active) setStats(map);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const start = (value) => {
    const text = (value ?? brief).trim();
    if (!text) return;
    navigate(`/new?q=${encodeURIComponent(text)}`);
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8">
        <section className="alpana-bg paper-grain relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-10">
          <span className="kantha-border absolute inset-x-0 top-0 h-1.5" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Your AI celebration planner
            </span>
            <h1 className="mt-5 max-w-2xl font-heading text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
              Plan the celebration, not the chaos.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Describe your event the way you would to a friend. You get a realistic budget that adds up, a timeline
              working backwards from the day, vendor checklists with the right questions, and ideas made for your guests.
            </p>

            <div className="mt-7 rounded-2xl border border-border bg-background p-2 shadow-soft">
              <Textarea
                value={brief}
                rows={3}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="My sister's engagement party, 60 guests, around ₹2 lakh, vegetarian-friendly, in March…"
                className="resize-none border-0 text-base shadow-none focus-visible:ring-0"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-1">
                <span className="text-xs text-muted-foreground">The more you tell me, the sharper the plan.</span>
                <Button className="rounded-full px-5" onClick={() => start()} disabled={!brief.trim()}>
                  Start planning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => start(example)}
                  className="max-w-full truncate rounded-full border border-border/80 bg-background/60 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-heading text-2xl">Your plans</h2>
            {plans.length ? <span className="text-sm text-muted-foreground">{plans.length} in progress</span> : null}
          </div>

          {loading ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-52 animate-pulse rounded-2xl border border-border/70 bg-card" />
              ))}
            </div>
          ) : plans.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} stats={stats[plan.id]} />
              ))}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-border px-6 py-16 text-center">
              <Loader2 className="h-5 w-5 text-muted-foreground" />
              <p className="mt-3 font-heading text-lg">Nothing here yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Describe your first celebration above and I'll build the whole plan from it.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}