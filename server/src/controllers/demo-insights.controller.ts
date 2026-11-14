import type { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { pool } from './auth.controller.js';
import { isPublicDemo } from '../repositories/db.js';

const events = new Set(['page_opened','demo_entered','tour_started','tour_skipped','tour_step_viewed','tour_completed','section_opened','contact_clicked']);
const sections = new Set(['dashboard','bikes','batteries','clients','rentals','outfits','repairs','inventory','shop','finance','documents','loyalty','employees','info','history']);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function demoInsights(req: Request, res: Response, next: NextFunction) {
  const route = req.path.replace(/^\/api(?=\/|$)/, '');
  if (!isPublicDemo() || !['/demo/events','/demo/feedback','/demo/report'].includes(route)) return next();
  res.setHeader('Cache-Control','no-store');
  try {
    if (route === '/demo/report') {
      if (req.method !== 'GET') return res.sendStatus(405);
      const key = process.env.DEMO_REPORT_KEY;
      const supplied = req.headers.authorization?.replace(/^Bearer\s+/i,'') || '';
      const digest = (s: string) => createHash('sha256').update(s).digest();
      if (!key || key.length < 32 || supplied.length > 256 || !timingSafeEqual(digest(key),digest(supplied))) return res.status(401).json({ error: 'Нет доступа к отчёту' });
      const db = pool();
      if (!db) return res.status(503).json({ error: 'Хранилище не настроено' });
      const totals = await db.query(`SELECT event,count(*)::int AS count,count(DISTINCT visitor_id)::int AS visitors FROM electream_demo.events WHERE created_at>=now()-interval '30 days' GROUP BY event ORDER BY event`);
      const steps = await db.query(`SELECT step,count(DISTINCT visitor_id)::int AS visitors FROM electream_demo.events WHERE event='tour_step_viewed' AND created_at>=now()-interval '30 days' GROUP BY step ORDER BY step`);
      const modules = await db.query(`SELECT section,count(DISTINCT visitor_id)::int AS visitors FROM electream_demo.events WHERE event='section_opened' AND created_at>=now()-interval '30 days' GROUP BY section ORDER BY visitors DESC`);
      const feedback = await db.query(`SELECT id,fit,comment,contact,created_at FROM electream_demo.feedback WHERE created_at>=now()-interval '90 days' ORDER BY created_at DESC LIMIT 200`);
      return res.json({ totals:totals.rows,steps:steps.rows,sections:modules.rows,feedback:feedback.rows });
    }
    if (req.method !== 'POST') return res.sendStatus(405);
    if (Buffer.byteLength(JSON.stringify(req.body || {}))>10000) return res.sendStatus(413);
    const { visitorId,id } = req.body || {};
    if (!uuid.test(visitorId || '') || !uuid.test(id || '')) return res.sendStatus(400);
    const db = pool();
    if (!db) return res.status(503).json({ error:'Хранилище недоступно' });
    const feedback = route === '/demo/feedback';
    const { event,section,step,fit,comment='',contact='',consent=false } = req.body;
    if (!feedback && (!events.has(event) || (section!==undefined && !sections.has(section)) || (step!==undefined && (!Number.isInteger(step)||step<1||step>12)))) return res.sendStatus(400);
    if (feedback && (!['yes','partly','no','unsure'].includes(fit) || typeof comment!=='string' || comment.length>2000 || typeof contact!=='string' || contact.length>200 || typeof consent!=='boolean' || (contact.trim()&&!consent))) return res.status(400).json({error:'Проверьте поля и согласие на связь'});
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(19861113, 2)');
      const table = feedback ? 'feedback' : 'events';
      const existing = await client.query(`SELECT id FROM electream_demo.${table} WHERE id=$1`,[id]);
      if (existing.rowCount) { await client.query('COMMIT'); return res.json({success:true}); }
      const limits = await client.query(`SELECT count(*)::int AS total,count(*) FILTER (WHERE visitor_id=$1)::int AS visitor FROM electream_demo.${table} WHERE created_at>now()-interval '1 day'`,[visitorId]);
      if (limits.rows[0].total >= (feedback?500:10000) || limits.rows[0].visitor >= (feedback?5:1000)) { await client.query('ROLLBACK'); return res.status(429).json({error:'Лимит запросов достигнут. Попробуйте позже.'}); }
      if (feedback) await client.query('INSERT INTO electream_demo.feedback (id,visitor_id,fit,comment,contact,consent) VALUES ($1,$2,$3,$4,$5,$6)',[id,visitorId,fit,comment.trim(),contact.trim(),consent]);
      else await client.query('INSERT INTO electream_demo.events (id,visitor_id,event,section,step) VALUES ($1,$2,$3,$4,$5)',[id,visitorId,event,section||null,step||null]);
      await client.query('COMMIT');
      return res.status(201).json({success:true});
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch {
    return res.status(503).json({error:'Не удалось сохранить или загрузить данные. Повторите позже.'});
  }
}
