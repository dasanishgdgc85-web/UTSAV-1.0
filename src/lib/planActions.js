const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


const PROFILE_FIELDS = [
  "title",
  "event_type",
  "event_date",
  "location",
  "city_tier",
  "guest_count",
  "budget_total",
  "currency",
  "style",
  "venue_type",
  "dietary",
  "cultural_traditions",
  "accessibility_needs",
  "must_haves",
  "exclusions",
  "assumptions",
];

export function cleanProfile(profile, extra = {}) {
  const out = {};
  PROFILE_FIELDS.forEach((key) => {
    if (profile && profile[key] !== undefined) out[key] = profile[key];
  });
  return { ...out, ...extra };
}

function budgetPayload(planId, item) {
  return {
    plan_id: planId,
    category: item.category,
    label: item.label || item.category,
    estimate_low: Number(item.estimate_low) || 0,
    estimate_high: Number(item.estimate_high) || 0,
    priority: item.priority || "must_have",
    locked: !!item.locked,
    rationale: item.rationale || "",
    confidence: item.confidence || "medium",
    hidden_cost_note: item.hidden_cost_note || "",
  };
}

function taskPayload(planId, task) {
  return {
    plan_id: planId,
    title: task.title,
    description: task.description || "",
    phase: task.phase || "",
    category: task.category || "general",
    due_date: task.due_date,
    offset_days: Number(task.offset_days) || 0,
    owner: task.owner || "You",
    effort: task.effort || "medium",
    status: task.status || "todo",
    is_at_risk: !!task.is_at_risk,
    risk_note: task.risk_note || "",
    depends_on: task.depends_on || [],
  };
}

export async function createPlanFromGeneration({ profile, generated, brief, chat = [] }) {
  const plan = await db.entities.Plan.create(
    cleanProfile(profile, {
      title: profile.title || "My celebration",
      budget_total: generated.budget_total || profile.budget_total || 0,
      source_brief: brief || "",
      status: "active",
      assumptions: [
        ...(profile.assumptions || []),
        ...(generated.assumptions || []),
        ...(generated.risks || []).map((r) => `Watch out — ${r.title}: ${r.note}`),
      ].slice(0, 14),
    })
  );

  const planId = plan.id;
  const calls = [
    generated.budget?.length
      ? db.entities.BudgetItem.bulkCreate(generated.budget.map((i) => budgetPayload(planId, i)))
      : null,
    generated.tasks?.length
      ? db.entities.Task.bulkCreate(generated.tasks.map((t) => taskPayload(planId, t)))
      : null,
    generated.vendors?.length
      ? db.entities.Vendor.bulkCreate(
          generated.vendors.map((v) => ({
            plan_id: planId,
            vendor_type: v.vendor_type,
            essential: !!v.essential,
            why: v.why || "",
            status: "shortlisted",
            questions: v.questions || [],
            contract_checks: v.contract_checks || [],
            red_flags: v.red_flags || [],
          }))
        )
      : null,
    generated.ideas?.length
      ? db.entities.Idea.bulkCreate(
          generated.ideas.map((idea) => ({
            plan_id: planId,
            category: idea.category || "idea",
            title: idea.title,
            description: idea.description || "",
            estimated_cost: Number(idea.estimated_cost) || 0,
            effort: idea.effort || "medium",
            safety_note: idea.safety_note || "",
          }))
        )
      : null,
    chat.length
      ? db.entities.ConversationMessage.bulkCreate(
          chat.slice(-10).map((m) => ({ plan_id: planId, role: m.role, content: m.content }))
        )
      : null,
  ];

  await Promise.all(calls.filter(Boolean));
  return plan;
}

export async function persistEdit(plan, budgetItems, tasks, edit) {
  const incoming = edit.budget?.items || [];
  const updates = [];
  const creates = [];
  const known = new Set(budgetItems.map((b) => b.id));

  incoming.forEach((item) => {
    if (item.id && known.has(item.id)) {
      updates.push({ id: item.id, ...budgetPayload(plan.id, item) });
    } else {
      creates.push(budgetPayload(plan.id, item));
    }
  });

  const removed = budgetItems.filter((b) => !incoming.some((i) => i.id === b.id));

  const taskUpdates = [];
  (edit.task_updates || []).forEach((tu) => {
    const needle = String(tu.title || "").toLowerCase();
    if (!needle) return;
    const match =
      tasks.find((t) => t.title.toLowerCase() === needle) ||
      tasks.find((t) => t.title.toLowerCase().includes(needle.slice(0, 14)));
    if (match) taskUpdates.push({ id: match.id, status: tu.status || "todo" });
  });

  (edit.reschedule || []).forEach((r) => {
    if (!r.id) return;
    taskUpdates.push({ id: r.id, due_date: r.due_date, offset_days: r.offset_days, is_at_risk: !!r.is_at_risk });
  });

  const planPatch = { budget_total: edit.budget?.total ?? plan.budget_total };
  const changedKeys = Object.keys(edit.profile_updates || {});
  if (changedKeys.length) {
    planPatch.budget_total = edit.budget?.total ?? plan.budget_total;
    Object.entries(edit.profile_updates).forEach(([key, value]) => {
      planPatch[key] = value;
    });
    const summary = changedKeys
      .filter((k) => k !== "budget_total")
      .map((k) => `${k.replace(/_/g, " ")} → ${Array.isArray(edit.profile_updates[k]) ? edit.profile_updates[k].join(", ") : edit.profile_updates[k]}`)
      .join("; ");
    if (summary) {
      planPatch.assumptions = [...(plan.assumptions || []), `You changed via chat: ${summary}`].slice(-12);
    }
  }

  await db.entities.Plan.update(plan.id, planPatch);
  if (updates.length) await db.entities.BudgetItem.bulkUpdate(updates);
  if (creates.length) await db.entities.BudgetItem.bulkCreate(creates);
  if (removed.length) await Promise.all(removed.map((r) => db.entities.BudgetItem.delete(r.id)));
  if (taskUpdates.length) await db.entities.Task.bulkUpdate(taskUpdates);
  if (edit.create_tasks?.length) {
    await db.entities.Task.bulkCreate(edit.create_tasks.map((t) => taskPayload(plan.id, t)));
  }
  if (edit.new_ideas?.length) {
    await db.entities.Idea.bulkCreate(
      edit.new_ideas.map((idea) => ({
        plan_id: plan.id,
        category: idea.category || "idea",
        title: idea.title,
        description: idea.description || "",
        estimated_cost: Number(idea.estimated_cost) || 0,
        effort: idea.effort || "medium",
      }))
    );
  }

  return { budget_total: planPatch.budget_total };
}

export async function rebalanceBudget(plan, budgetItems) {
  const response = await db.functions.invoke("rebalancePlan", {
    total: plan.budget_total || 0,
    items: budgetItems.map((item) => ({
      id: item.id,
      plan_id: item.plan_id,
      category: item.category,
      label: item.label,
      estimate_low: item.estimate_low,
      estimate_high: item.estimate_high,
      priority: item.priority,
      locked: item.locked,
      rationale: item.rationale,
      confidence: item.confidence,
      quoted: item.quoted,
      actual: item.actual,
      notes: item.notes,
    })),
  });

  const items = response.data?.items || [];
  await Promise.all(
    items.map((item) => db.entities.BudgetItem.update(item.id, {
      estimate_low: item.estimate_low,
      estimate_high: item.estimate_high,
    }))
  );
  await db.entities.Plan.update(plan.id, { budget_total: response.data?.total ?? plan.budget_total });
  return response.data;
}