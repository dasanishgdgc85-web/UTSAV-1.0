const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    event_type: { type: "string", enum: ["wedding", "birthday", "community", "anniversary", "baby_shower", "farewell", "other"] },
    event_date: { type: "string" },
    event_date_note: { type: "string" },
    location: { type: "string" },
    city_tier: { type: "string", enum: ["metro", "large_city", "small_town", "rural", "unknown"] },
    guest_count: { type: "number" },
    budget_total: { type: "number" },
    currency: { type: "string" },
    style: { type: "string" },
    venue_type: { type: "string" },
    dietary: { type: "array", items: { type: "string" } },
    cultural_traditions: { type: "array", items: { type: "string" } },
    accessibility_needs: { type: "array", items: { type: "string" } },
    must_haves: { type: "array", items: { type: "string" } },
    exclusions: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    clarifying_questions: { type: "array", items: { type: "string" } },
    ready: { type: "boolean" },
    reply: { type: "string" },
  },
  required: ["title", "event_type", "event_date", "guest_count", "budget_total", "currency", "assumptions", "clarifying_questions", "ready", "reply"],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const today = (body && body.today) || new Date().toISOString().slice(0, 10);
    const current = (body && body.currentProfile) || {};
    const conversation = Array.isArray(body && body.conversation) ? body.conversation.slice(-14) : [];
    if (!conversation.length) return Response.json({ error: 'Nothing to read yet' }, { status: 400 });

    const transcript = conversation.map((m) => `${m.role === 'user' ? 'Planner' : 'Assistant'}: ${m.content}`).join('\n');

    const prompt = `You are the intake assistant for Celebration, a warm, practical event-planning assistant for India. Today's date is ${today}. Default currency is INR.
Read the conversation and return the most complete, accurate event profile you can, merging anything already known with what is new.

Already known (keep it unless the conversation corrects it):
${JSON.stringify(current)}

Conversation so far:
${transcript}

Rules:
- Extract only what is stated or safely implied by the planner's own words. Never invent names, venues, vendors, prices, dishes or traditions.
- Understand Indian money and date phrasing: "2 lakh" = 200000, "40k" = 40000, "1.5 crore" = 15000000, "next March" = the coming March, "22 Nov" = the coming 22 November. Give event_date as YYYY-MM-DD, or an empty string if the date is unknown or too vague to pin down; put the original wording in event_date_note.
- If only one part of the guest list is given (for example "25 kids"), you may estimate the full attendance, but say so plainly in assumptions, e.g. "Assumed about 50 people in all (25 children plus one adult each)".
- guest_count and budget_total must be numbers with no commas or symbols; use 0 when genuinely unknown.
- city_tier: metro for Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, Pune; large_city for other large cities; small_town for smaller towns; rural for villages; unknown when the location is unclear.
- dietary, cultural_traditions, accessibility_needs, must_haves and exclusions: short phrases, max 6 each, only what the planner said or clearly implied. Never assume a religion, diet or tradition on their behalf.
- assumptions: every inference you made, in plain friendly language, each one something the planner can correct.
- Ask at most 3 clarifying questions, and only ones that would actually change the plan (date, guest count, budget, location, a hard constraint). Never ask what you can reasonably infer, never ask for the same thing twice, and return none once those essentials are known.
- ready: true when you know the event type plus at least the date and either guest count or budget, and you have no essential question left unanswered.
- reply: one or two warm, specific sentences reacting to what the planner told you and saying what you understood. Mention the biggest assumption you made. Do not use bullet points, no emojis.
Return JSON only.`;

    const profile = await db.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
    return Response.json({ profile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}