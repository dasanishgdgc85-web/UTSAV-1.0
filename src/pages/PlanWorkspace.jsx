const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LayoutList, MessageSquare } from "lucide-react";
import ChatPanel from "@/components/planner/ChatPanel";
import PlanHeader from "@/components/planner/PlanHeader";
import ProfileTab from "@/components/planner/ProfileTab";
import BudgetTab from "@/components/planner/BudgetTab";
import TimelineTab from "@/components/planner/TimelineTab";
import VendorsTab from "@/components/planner/VendorsTab";
import IdeasTab from "@/components/planner/IdeasTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import AppHeader from "@/components/planner/AppHeader";
import { cleanProfile, persistEdit, rebalanceBudget } from "@/lib/planActions";
import { exportPlanPdf } from "@/lib/exportPlanPdf";

const SUGGESTIONS = [
  "What have I forgotten?",
  "Cut décor by 20%",
  "How can I save money?",
  "Add a live music slot",
];

export default function PlanWorkspace() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [data, setData] = useState({ plan: null, budget: [], tasks: [], vendors: [], ideas: [], messages: [] });
  const [status, setStatus] = useState("loading");
  const [tab, setTab] = useState("budget");
  const [view, setView] = useState("plan");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const plan = await db.entities.Plan.get(id);
      const [budget, tasks, vendors, ideas, messages] = await Promise.all([
        db.entities.BudgetItem.filter({ plan_id: id }, { sort: "-created_date", limit: 60 }),
        db.entities.Task.filter({ plan_id: id }, { sort: "due_date", limit: 200 }),
        db.entities.Vendor.filter({ plan_id: id }, { sort: "-created_date", limit: 40 }),
        db.entities.Idea.filter({ plan_id: id }, { sort: "-created_date", limit: 60 }),
        db.entities.ConversationMessage.filter({ plan_id: id }, { sort: "created_date", limit: 100 }),
      ]);
      setData({
        plan,
        budget: budget.items || [],
        tasks: tasks.items || [],
        vendors: vendors.items || [],
        ideas: ideas.items || [],
        messages: messages.items || [],
      });
      setStatus("ready");
    } catch (error) {
      setStatus("missing");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runEdit = async (text, autoApply = false) => {
    if (!text.trim() || busy) return null;
    setBusy(true);
    try {
      const userMessage = await db.entities.ConversationMessage.create({
        plan_id: id,
        role: "user",
        content: text,
      });
      setData((prev) => ({ ...prev, messages: [...prev.messages, userMessage] }));

      const history = [...data.messages, userMessage].slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const response = await db.functions.invoke("applyPlanEdit", {
        profile: data.plan,
        total: data.plan.budget_total,
        budget: data.budget,
        tasks: data.tasks,
        message: text,
        history,
      });
      const edit = response.data || {};

      const payload = {
        changed: !!edit.changed,
        diff: edit.diff || [],
        total_from: data.plan.budget_total,
        total_to: edit.budget?.total ?? data.plan.budget_total,
        task_updates: edit.task_updates || [],
        create_tasks: edit.create_tasks || [],
        new_ideas: edit.new_ideas || [],
        profile_updates: edit.profile_updates || {},
        edit,
      };

      let stored = JSON.stringify(payload);
      if (autoApply && edit.changed) {
        await persistEdit(data.plan, data.budget, data.tasks, edit);
        stored = JSON.stringify({ ...payload, applied: "confirmed" });
      }

      const assistantMessage = await db.entities.ConversationMessage.create({
        plan_id: id,
        role: "assistant",
        content: edit.reply || "Here's what I found.",
        payload: stored,
      });

      if (autoApply && edit.changed) {
        await load();
      } else {
        setData((prev) => ({ ...prev, messages: [...prev.messages, assistantMessage] }));
      }
      return assistantMessage;
    } catch (error) {
      toast({
        title: "I couldn't work that out",
        description: "Your plan is untouched. Try wording it a little differently.",
        variant: "destructive",
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (message) => {
    const payload = JSON.parse(message.payload || "{}");
    if (!payload.edit) return;
    setApplying(true);
    try {
      await persistEdit(data.plan, data.budget, data.tasks, payload.edit);
      await db.entities.ConversationMessage.update(message.id, {
        payload: JSON.stringify({ ...payload, applied: "confirmed" }),
        applied: true,
      });
      await load();
      toast({ title: "Plan updated", description: "Your budget, tasks and details reflect the change." });
    } finally {
      setApplying(false);
    }
  };

  const discard = async (message) => {
    const payload = JSON.parse(message.payload || "{}");
    const stored = JSON.stringify({ ...payload, applied: "discarded" });
    await db.entities.ConversationMessage.update(message.id, { payload: stored, applied: true });
    setData((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === message.id ? { ...m, payload: stored, applied: true } : m)),
    }));
  };

  const patchBudget = async (itemId, patch) => {
    const nextBudget = data.budget.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    setData((prev) => ({ ...prev, budget: nextBudget }));
    await db.entities.BudgetItem.update(itemId, patch);

    if ("locked" in patch || "priority" in patch) {
      setRebalancing(true);
      try {
        await rebalanceBudget(data.plan, nextBudget);
        await load();
      } finally {
        setRebalancing(false);
      }
    }
  };

  const saveProfile = async (draft) => {
    setSavingProfile(true);
    try {
      await db.entities.Plan.update(data.plan.id, cleanProfile(draft));
      await load();
      toast({ title: "Details saved", description: "Ask in chat to re-balance the plan around them." });
    } finally {
      setSavingProfile(false);
    }
  };

  const setTaskStatus = async (task, nextStatus) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    }));
    await db.entities.Task.update(task.id, { status: nextStatus });
  };

  const patchVendor = async (vendorId, patch) => {
    setData((prev) => ({
      ...prev,
      vendors: prev.vendors.map((v) => (v.id === vendorId ? { ...v, ...patch } : v)),
    }));
    await db.entities.Vendor.update(vendorId, patch);
  };

  const addVendor = async (draft) => {
    const created = await db.entities.Vendor.create({
      plan_id: id,
      vendor_type: draft.vendor_type,
      name: draft.name,
      status: "shortlisted",
      essential: false,
      user_added: true,
    });
    setData((prev) => ({ ...prev, vendors: [...prev.vendors, created] }));
  };

  const reactToIdea = async (idea, patch) => {
    setData((prev) => ({ ...prev, ideas: prev.ideas.map((i) => (i.id === idea.id ? { ...i, ...patch } : i)) }));
    await db.entities.Idea.update(idea.id, patch);
  };

  const addIdeaToPlan = async (idea) => {
    const text = `Add this idea to my plan: ${idea.title} — ${idea.description} It costs about ${idea.estimated_cost} ${data.plan.currency}. Put it in the budget and give me the task that goes with it.`;
    const message = await runEdit(text, true);
    if (message) {
      await db.entities.Idea.update(idea.id, { added: true });
      setData((prev) => ({ ...prev, ideas: prev.ideas.map((i) => (i.id === idea.id ? { ...i, added: true } : i)) }));
      toast({ title: "Added to your plan", description: "The budget and timeline now include it." });
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    );
  }

  if (status === "missing" || !data.plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-heading text-2xl">This plan isn't here</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been deleted, or it belongs to another planner.
        </p>
      </div>
    );
  }

  const { plan, budget, tasks, vendors, ideas, messages } = data;

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <PlanHeader
        plan={plan}
        exporting={exporting}
        onExport={() => {
          setExporting(true);
          try {
            exportPlanPdf({ plan, budget, tasks, vendors });
          } finally {
            setExporting(false);
          }
        }}
      />

      <div className="mx-auto w-full max-w-[1400px] px-4 pt-5 lg:hidden">
        <div className="inline-flex gap-1 rounded-full border border-border/80 bg-card p-1">
          <button
            type="button"
            onClick={() => setView("plan")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
              view === "plan" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <LayoutList className="h-4 w-4" />
            Plan
          </button>
          <button
            type="button"
            onClick={() => setView("chat")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
              view === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-6 lg:py-6">
        <div className={view === "plan" ? "block" : "hidden lg:block"}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-5 h-auto flex-wrap justify-start gap-1 rounded-full bg-secondary/70 p-1">
              <TabsTrigger value="budget" className="rounded-full px-4">Budget</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-full px-4">Timeline</TabsTrigger>
              <TabsTrigger value="vendors" className="rounded-full px-4">Vendors</TabsTrigger>
              <TabsTrigger value="ideas" className="rounded-full px-4">Ideas</TabsTrigger>
              <TabsTrigger value="profile" className="rounded-full px-4">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="budget" className="mt-0">
              <BudgetTab
                plan={plan}
                items={budget}
                busy={rebalancing}
                onPatch={patchBudget}
              />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <TimelineTab tasks={tasks} onStatus={setTaskStatus} />
            </TabsContent>
            <TabsContent value="vendors" className="mt-0">
              <VendorsTab vendors={vendors} onPatch={patchVendor} onAdd={addVendor} />
            </TabsContent>
            <TabsContent value="ideas" className="mt-0">
              <IdeasTab
                ideas={ideas}
                currency={plan.currency}
                busy={busy}
                onReact={reactToIdea}
                onAdd={addIdeaToPlan}
              />
            </TabsContent>
            <TabsContent value="profile" className="mt-0">
              <ProfileTab plan={plan} onSave={saveProfile} saving={savingProfile} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className={view === "chat" ? "block" : "hidden lg:block"}>
          <div className="alpana-bg h-[70vh] overflow-hidden rounded-2xl border border-border/70 bg-card lg:sticky lg:top-[80px] lg:h-[calc(100vh-100px)]">
            <ChatPanel
              messages={messages}
              busy={busy}
              applying={applying}
              onSend={(text) => runEdit(text)}
              onConfirm={confirm}
              onDiscard={discard}
              suggestions={SUGGESTIONS}
            />
          </div>
        </aside>

      </div>
    </div>
  );
}