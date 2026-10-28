const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeBudget, totalOf } from '../../shared/planEngine.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const total = Math.max(0, Number(body && body.total) || 0);
    const items = Array.isArray(body && body.items) ? body.items.slice(0, 40).map((i) => ({
      id: i.id,
      plan_id: i.plan_id,
      category: i.category,
      label: i.label,
      estimate_low: i.priority === 'skip' ? 0 : Number(i.estimate_low) || 0,
      estimate_high: i.priority === 'skip' ? 0 : Number(i.estimate_high) || 0,
      priority: i.priority || 'must_have',
      locked: !!i.locked,
      rationale: i.rationale,
      confidence: i.confidence,
      quoted: i.quoted,
      actual: i.actual,
      notes: i.notes,
    })) : [];

    const next = normalizeBudget(items, total);

    return Response.json({
      items: next.map((i) => ({
        id: i.id,
        category: i.category,
        estimate_low: i.estimate_low,
        estimate_high: i.estimate_high,
      })),
      total: totalOf(next),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}