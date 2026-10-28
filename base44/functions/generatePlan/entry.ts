const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeBudget, buildTimeline, totalOf } from '../../shared/planEngine.ts';

const SCHEMA = {
  type: "object",
  properties: {
    budget: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          label: { type: "string" },
          amount: { type: "number" },
          priority: { type: "string", enum: ["must_have", "nice_to_have"] },
          rationale: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          hidden_cost_note: { type: "string" },
        },
        required: ["category", "label", "amount", "priority", "rationale", "confidence"],
      },
    },
    tasks: {
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
          depends_on: { type: "array", items: { type: "string" } },
        },
        required: ["title", "description", "phase", "offset_days", "owner", "effort", "category"],
      },
    },
    vendors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          vendor_type: { type: "string" },
          essential: { type: "boolean" },
          why: { type: "string" },
          questions: { type: "array", items: { type: "string" } },
          contract_checks: { type: "array", items: { type: "string" } },
          red_flags: { type: "array", items: { type: "string" } },
        },
        required: ["vendor_type", "essential", "why", "questions", "contract_checks", "red_flags"],
      },
    },
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          estimated_cost: { type: "number" },
          effort: { type: "string", enum: ["low", "medium", "high"] },
          safety_note: { type: "string" },
        },
        required: ["category", "title", "description", "estimated_cost", "effort"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, note: { type: "string" } },
        required: ["title", "note"],
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
  },
  required: ["budget", "tasks", "vendors", "ideas", "risks", "assumptions"],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const p = (body && body.profile) || {};
    const today = (body && body.today) || new Date().toISOString().slice(0, 10);
    const total = Math.max(0, Number(p.budget_total) || 0);
    const leadDays = p.event_date
      ? Math.max(0, Math.round((new Date(`${p.event_date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000))
      : 0;

    const prompt = `You are Celebration, an expert, warm event planner working in India. Today is ${today}. Build a complete first plan for this celebration.

EVENT PROFILE
${JSON.stringify(p, null, 1)}

Planning facts: ${leadDays} days from today to the event. Budget ${total} ${p.currency || 'INR'}. Guest count ${p.guest_count || 'unknown'}.

Produce four things.

1) BUDGET — itemised categories that add up to the budget. Aim for 10% contingency. Typical Indian shares of the non-contingency total (adapt to event type, city tier, guest count and style):
weddings: catering 35-45%, venue 10-20%, decor 8-15%, photography and video 6-10%, entertainment 4-8%, attire and beauty 5-12%, invitations and stationery 1-3%, transport and logistics 2-5%, rituals and religious items 2-5%, gifts and favours 2-4%.
birthdays: food and cake 30-40%, decor 12-20%, activities and entertainment 10-18%, venue or rentals 10-20%, return gifts 5-12%, invites and printing 2-4%.
community events: venue or ground 8-15%, catering and refreshments 25-35%, sound, stage and lighting 10-18%, permits, security and first aid 8-15%, printing and publicity 5-10%, volunteers and logistics 5-10%.
Rules: amounts must be numbers in ${p.currency || 'INR'}; every category needs a one-sentence rationale explaining the allocation and a confidence level (low when you are guessing about local prices); fold taxes, service charge, tips, overtime and delivery into hidden_cost_note where they apply, and never hide them. Include a category named "contingency". Never place a category the planner excluded.

2) TIMELINE — 16 to 24 tasks that work backwards from the event, phase names like "6 months out", "1 month out", "Week of the event", "Day of". offset_days = days before the event the task is due. Owners are roles: "You", "Your partner", "Family", "Volunteer lead", "Committee", "Point person". Each description is one or two practical sentences with what to check or decide. Cover what first-time planners forget: deposits and payment dates, permits, insurance, backup plans for weather and power, vendor contracts, final headcount, seating, transport, tips. Do not repeat a task.

3) VENDORS — 6 to 9 vendor types for this event, each with why it matters, whether it is essential or optional, 5 to 8 tailored questions to ask, 4 contract checks, and 3 to 4 red flags. Never invent a business name, phone number, review or website; you are writing questions and checks only.

4) IDEAS — 6 to 8 specific, personal ideas across theme, decor, menu, activities, entertainment, favours and invitation wording. Each with an honest estimated_cost in ${p.currency || 'INR'} and an effort level. Ideas must be built for this profile: the age group, interests, season, region, budget, dietary needs, cultural traditions and accessibility needs all matter. Zero tolerance: nothing may break a stated dietary, religious, cultural, exclusion or accessibility constraint. Include at least one idea that saves money and one that is a DIY option. Put a short safety_note on anything involving crowds, fire, food safety, children, water or animals.

Also give risks (3 items: the most likely things to go wrong for this event and the one-line mitigation) and assumptions (everything you assumed, phrased so the planner can correct it).

Voice: warm, encouraging, practical, specific. Never generic filler. Prices are always estimates to verify with vendors. No legal, tax or financial advice. No emojis. Return JSON only.`;

    const generated = await db.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });

    // The model proposes amounts; the engine is what makes them add up exactly.
    const proposed = (generated.budget || []).map((item) => ({
      ...item,
      estimate_low: Math.max(0, Number(item.amount) || 0),
      estimate_high: Math.max(0, Number(item.amount) || 0),
    }));
    const budgetItems = normalizeBudget(proposed, total);
    const tasks = p.event_date ? buildTimeline(generated.tasks || [], p.event_date, today) : generated.tasks || [];

    return Response.json({
      budget: budgetItems,
      budget_total: totalOf(budgetItems),
      tasks,
      vendors: generated.vendors || [],
      ideas: generated.ideas || [],
      risks: generated.risks || [],
      assumptions: generated.assumptions || [],
      lead_days: leadDays,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}