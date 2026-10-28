const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Loader2, Wand2 } from "lucide-react";
import AppHeader from "@/components/planner/AppHeader";
import IntakeChat from "@/components/planner/IntakeChat";
import ProfileForm from "@/components/planner/ProfileForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { useAuth } from "@/lib/AuthContext";
import { createPlanFromGeneration } from "@/lib/planActions";
import { EVENT_TYPE_LABELS, formatMoney } from "@/lib/format";

const STAGES = [
  "Reading your brief…",
  "Splitting your budget across categories…",
  "Back-planning the timeline from your date…",
  "Writing vendor questions and red flags…",
  "Checking every idea against your constraints…",
];

const OPENING = {
  role: "assistant",
  content:
    "Tell me about the celebration — what it is, roughly how many people, your budget, and when it is. I'll ask only what I really need to know.",
};

export default function NewPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const brief = useRef(new URLSearchParams(window.location.search).get("q") || "").current;
  const started = useRef(false);

  const [messages, setMessages] = useState(brief ? [] : [OPENING]);
  const [profile, setProfile] = useState({ currency: "INR", event_type: "other", title: "", assumptions: [] });
  const [thinking, setThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);

  const today = new Date().toISOString().slice(0, 10);
  const pendingQuestions = messages[messages.length - 1]?.questions || [];
  const canGenerate = !!profile.event_date && (!!profile.guest_count || !!profile.budget_total);

  const send = async (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed || thinking) return;
    const conversation = [...messages, { role: "user", content: trimmed }];
    setMessages(conversation);
    setThinking(true);
    try {
      const response = await db.functions.invoke("extractProfile", {
        conversation,
        currentProfile: profile,
        today,
      });
      const next = response.data?.profile || {};
      setProfile((prev) => {
        const merged = { ...prev };
        Object.entries(next).forEach(([key, val]) => {
          if (val === null || val === undefined || val === "") return;
          if (typeof val === "number" && !val) return;
          if (Array.isArray(val) && !val.length) return;
          merged[key] = val;
        });
        return merged;
      });
      setMessages([
        ...conversation,
        { role: "assistant", content: next.reply || "Got it.", questions: next.clarifying_questions || [] },
      ]);
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    if (brief && !started.current) {
      started.current = true;
      send(brief);
    }
  }, [brief]);

  const generate = async () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2400);
    try {
      const response = await db.functions.invoke("generatePlan", { profile, today });
      const generated = response.data || {};
      const plan = await createPlanFromGeneration({ profile, generated, brief, chat: messages });
      navigate(`/plan/${plan.id}`);
    } catch (error) {
      toast({
        title: "I couldn't finish that plan",
        description: "Nothing is lost — your details are still here. Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      clearInterval(timer);
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-5 pb-24 pt-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-[60vh] flex-col rounded-3xl border border-border/70 bg-card/60 p-5 lg:h-[calc(100vh-140px)]">
          <div className="mb-3">
            <h1 className="font-heading text-2xl">Let's plan something beautiful</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Plain words are enough. I'll label every assumption so you can correct me.
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <IntakeChat messages={messages} thinking={thinking} onSend={send} pendingQuestions={pendingQuestions.length} />
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-140px)] lg:overflow-y-auto">
          <div className="rounded-3xl border border-border/70 bg-card p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg">Your event profile</h2>
              {generating ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the single source of truth — the budget, timeline, vendors and ideas all come from it.
            </p>

            <div className="mt-4 rounded-2xl bg-secondary/60 px-4 py-3 text-sm">
              <p className="tabular-nums">
                {profile.guest_count ? `${profile.guest_count} guests` : "Guest count to confirm"}
                <span className="text-muted-foreground"> · </span>
                {profile.budget_total ? formatMoney(profile.budget_total, profile.currency) : "Budget to confirm"}
                <span className="text-muted-foreground"> · </span>
                {EVENT_TYPE_LABELS[profile.event_type] || "Celebration"}
              </p>
            </div>

            {generating ? (
              <div className="mt-4 space-y-2">
                {STAGES.map((label, index) => (
                  <p
                    key={label}
                    className={`flex items-center gap-2 text-sm ${
                      index <= stage ? "text-foreground" : "text-muted-foreground/60"
                    }`}
                  >
                    {index < stage ? <span className="text-accent">✓</span> : <span className="h-3.5 w-3.5 rounded-full border border-current" />}
                    {label}
                  </p>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <ProfileForm profile={profile} onChange={(patch) => setProfile((prev) => ({ ...prev, ...patch }))} />
              </div>
            )}

            {!generating ? (
              <>
                {!profile.event_date ? (
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent/10 px-3.5 py-2.5 text-xs text-accent">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Add the date and I can build the timeline that works backwards from it.
                  </p>
                ) : null}
                <Button
                  className="mt-5 w-full rounded-full"
                  size="lg"
                  onClick={generate}
                  disabled={!canGenerate || thinking}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate my plan
                </Button>
                <p className="mt-2.5 text-center text-xs text-muted-foreground">
                  Usually ready in under a minute.
                </p>
              </>
            ) : null}
          </div>
        </aside>
      </main>
    </div>
  );
}