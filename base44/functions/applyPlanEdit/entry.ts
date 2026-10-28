const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeBudget, buildTimeline, midOf, totalOf, roundTo } from '../../shared/planEngine.ts';

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    new_total: { type: "number" },
    budget_changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          change_pct: { type: "number" },
          target_amount: { type: "number" },
          reason: { type: "string" },
        },
        required: ["category", "reason"],
      },
    },
    new_budget_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          label: { type: "string" },
          amount: { type: "number" },
          priority: { type: "string", enum: ["must_have", "nice_to_have"] },
          reason: { type: "string" },
        },
        required: ["category", "label", "amount", "reason"],
      },
    },
    remove_categories: { type: "array", items: { type: "string" } },
    lock_categories: { type: "array", items: { type: "string" } },
    task_updates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
          reason: { type: "string" },
        },
        required: ["title", "reason"],
      },
    },
    new_tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          phase: { type: "string" },
          offset_days: { type: "number" },
          owner: { type: "string" },
          effort: { type: "string", enum: ["small", "medium", "large"] },
          category: { type: "string" },
        },
        required: ["title", "description", "phase", "offset_days", "owner", "effort", "category"],
      },
    },
    new_ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          estimated_cost: { type: "number" },
          effort: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["category", "title", "description", "estimated_cost", "effort"],
      },
    },
    profile_updates: {
      type: "object",
      properties: {
        title: { type: "string" },
        event_date: { type: "string" },
        guest_count: { type: "number" },
        budget_total: { type: "number" },
        location: { type: "string" },
        style: { type: "string" },
        venue_type: { type: "string" },
        dietary: { type: "array", items: { type: "string" } },
        cultural_traditions: { type: "array", items: { type: "string" } },
        accessibility_needs: { type: "array", items: { type: "string" } },
        must_haves: { type: "array", items: { type: "string" } },
        exclusions: { type: "array", items: { type: "string" } },
      },
    },
  },
  required: ["reply", "budget_changes", "new_budget_items", "remove_categories", "lock_categories", "task_updates", "new_tasks", "new_ideas"],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const profile = (body && body.profile) || {};
    const total = Math.max(0, Number(body && body.total) || 0);
    const message = String((body && body.message) || '').slice(0, 2000);
    const today = (body && body.today) || new Date().toISOString().slice(0, 10);
    if (!message) return Response.json({ error: 'Empty message' }, { status: 400 });

    const budget = (body && body.budget) || [];
    const tasks = (body && body.tasks) || [];
    const history = Array.isArray(body && body.history) ? body.history.slice(-8) : [];

    const budgetView = budget.map((i) => ({
      category: i.category,
      label: i.label,
      amount: Math.round(midOf(i)),
      locked: !!i.locked,
      priority: i.priority || 'must_have',
    }));
    const taskView = tasks.map((t) => ({ title: t.title, phase: t.phase, due_date: t.due_date, status: t.status }));

    const prompt = `You are Celebration, the planning assistant inside a live event plan. Today is ${today}.

EVENT PROFILE
${JSON.stringify(profile, null, 1)}

CURRENT BUDGET (amounts in ${profile.currency || 'INR'}, total ${total}; locked items must never change)
${JSON.stringify(budgetView)}

CURRENT TASKS
${JSON.stringify(taskView.slice(0, 30))}

RECENT CHAT
${history.map((m) => `${m.role === 'user' ? 'Planner' : 'Assistant'}: ${m.content}`).join('\n') || '(none)'}

NEW MESSAGE FROM THE PLANNER
"${message}"

Decide what this means and respond.

- If it is a question, a request for advice, or a request to check the plan, answer it fully and helpfully in "reply" and leave every other field empty. Never invent vendors, phone numbers, reviews or firm prices; say prices are estimates to verify.
- If it is an edit, translate it into the smallest set of changes.
  - budget_changes: use change_pct for relative moves ("cut decor by 20%" = -20) or target_amount for absolute ones. Never target a locked category; if the planner asks for one, explain in "reply" that it is locked and leave it untouched.
  - new_budget_items: a new line the planner asked for, with an honest estimate as amount.
  - remove_categories: only when the planner wants a category gone.
  - lock_categories: when the planner asks to protect something.
  - new_total: the overall budget after the change. Set it when the planner changes the total, or when something new is added that increases spend (current total plus the new amount). Leave 0 when the change should only shuffle money between existing categories.
  - task_updates: when the planner reports progress ("we booked the venue", "cake is ordered") match the closest existing task title and set its status. title must match an existing task title closely.
  - new_tasks: for a new activity or decision that needs doing, with offset_days as days before the event it is due.
  - new_ideas: when the planner asks for suggestions, put them here so they can add them with one click.
  - profile_updates: only facts the planner actually changed (guest count, date, location, style, dietary needs, must-haves, exclusions). Omit everything else, never send 0 or empty values.
- Hard rules: never break a stated dietary, religious, cultural, exclusion or accessibility constraint. Never propose anything unsafe. Keep estimates honest and ranges realistic for Indian cities and towns.

"reply": two or three warm, concrete sentences telling the planner what you changed and why, and what the trade-off was. Say plainly if nothing changed because the message was a question. No bullet points, no emojis. Return JSON only.`;

    const edit = await db.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });

    // ---- deterministic budget engine ----
    let items = budget.map((i) => ({ ...i }));
    const before = items.map((i) => ({ category: i.category, label: i.label, mid: Math.round(midOf(i)) }));
    const protect = [];

    for (const change of edit.budget_changes || []) {
      const item = items.find((i) => i.category === change.category);
      if (!item || item.locked || item.priority === 'skip') continue;
      const current = midOf(item);
      const target = Number(change.target_amount) > 0
        ? Number(change.target_amount)
        : Number.isFinite(change.change_pct)
          ? current * (1 + change.change_pct / 100)
          : current;
      item.estimate_low = Math.max(0, roundTo(target));
      item.estimate_high = Math.max(0, roundTo(target));
      item.notes = change.reason || item.notes;
      protect.push(item.category);
    }

    for (const removal of edit.remove_categories || []) {
      items = items.filter((i) => i.category !== removal || i.locked);
    }

    for (const added of edit.new_budget_items || []) {
      if (items.some((i) => i.category === added.category)) {
        const existing = items.find((i) => i.category === added.category);
        if (!existing.locked) {
          const sum = midOf(existing) + (Number(added.amount) || 0);
          existing.estimate_low = Math.max(0, roundTo(sum));
          existing.estimate_high = Math.max(0, roundTo(sum));
          protect.push(existing.category);
        }
        continue;
      }
      items.push({
        plan_id: profile.id || (budget[0] && budget[0].plan_id),
        category: added.category,
        label: added.label || added.category,
        estimate_low: Math.max(0, roundTo(Number(added.amount) || 0)),
        estimate_high: Math.max(0, roundTo(Number(added.amount) || 0)),
        priority: added.priority || 'must_have',
        locked: false,
        rationale: added.reason,
        confidence: 'medium',
      });
      protect.push(added.category);
    }

    for (const lock of edit.lock_categories || []) {
      const item = items.find((i) => i.category === lock);
      if (item) item.locked = true;
    }

    const removedSum = before
      .filter((b) => !items.some((i) => i.category === b.category))
      .reduce((sum, b) => sum + b.mid, 0);
    const addedSum = (edit.new_budget_items || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const requestedTotal = Number(edit.new_total) > 0
      ? Number(edit.new_total)
      : Number(edit.profile_updates && edit.profile_updates.budget_total) > 0
        ? Number(edit.profile_updates.budget_total)
        : 0;
    const nextTotal = requestedTotal > 0 ? requestedTotal : total + addedSum - removedSum;

    const nextItems = normalizeBudget(items, nextTotal, protect);
    const diff = [];
    const seen = new Set();
    nextItems.forEach((item) => {
      seen.add(item.category);
      const was = before.find((b) => b.category === item.category);
      const now = Math.round(midOf(item));
      const from = was ? was.mid : 0;
      if (!was || Math.abs(now - from) >= 100) {
        diff.push({ category: item.category, label: item.label, from, to: now });
      }
    });
    before.forEach((b) => {
      if (!seen.has(b.category)) diff.push({ category: b.category, label: b.label, from: b.mid, to: 0 });
    });

    const newTasks = profile.event_date
      ? buildTimeline((edit.new_tasks || []).map((t) => ({ ...t, depends_on: [] })), profile.event_date, today)
      : (edit.new_tasks || []);

    const profileUpdates = {};
    Object.entries(edit.profile_updates || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' ) return;
      if (typeof value === 'number' && (!value || value <= 0)) return;
      if (Array.isArray(value) && !value.length) return;
      profileUpdates[key] = value;
    });
    // The budget total is driven by the deterministic engine, never by a profile edit.
    delete profileUpdates.budget_total;

    // A new event date means every task is re-scheduled from it.
    const effectiveDate = profileUpdates.event_date || profile.event_date;
    const reschedule = profileUpdates.event_date && effectiveDate
      ? buildTimeline(tasks.map((t) => ({ ...t })), effectiveDate, today)
      : [];

    return Response.json({
      reply: edit.reply,
      budget: { items: nextItems, total: totalOf(nextItems) },
      diff,
      budget_changed: diff.length > 0,
      task_updates: edit.task_updates || [],
      create_tasks: newTasks,
      reschedule,
      new_ideas: edit.new_ideas || [],
      profile_updates: profileUpdates,
      changed: diff.length > 0 || (edit.task_updates || []).length > 0 || newTasks.length > 0
        || (edit.new_ideas || []).length > 0 || Object.keys(profileUpdates).length > 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}