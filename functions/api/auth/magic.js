// POST /api/auth/magic  { email }
// Envía un magic link de acceso al portal del propietario.
// Responde SIEMPRE { ok:true } — no revela si el email existe (anti-enumeración).

import { json, readJson } from '../../_lib/http.js';
import { notionQuery } from '../../_lib/notion.js';
import { sendEmail } from '../../_lib/notify.js';
import { signToken, MAGIC_LINK_SEG } from '../../_lib/session.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return json({ ok: true });

  const leads = await notionQuery(env, env.NOTION_LEADS_DB_ID, {
    property: 'Email', email: { equals: email },
  });

  if (leads.length) {
    const token = await signToken(env, { p: 'magic', email }, MAGIC_LINK_SEG);
    const link = `${new URL(request.url).origin}/api/auth/callback?t=${encodeURIComponent(token)}`;
    await sendEmail(env, {
      to: email,
      subject: 'Tu acceso al Portal de Remates',
      text: `Hola,\n\nEntra a tu portal con este enlace (válido por 15 minutos):\n${link}\n\nSi no pediste este acceso, ignora este correo.\n\nAlonso López · alonsolopez.cl`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
          <p style="font-size:15px">Hola,</p>
          <p style="font-size:15px">Pulsa el botón para entrar a tu <strong>Portal de Remates</strong> y ver en qué va el proceso de tu propiedad.</p>
          <p style="margin:28px 0">
            <a href="${link}" style="background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-size:15px;display:inline-block">Entrar a mi portal</a>
          </p>
          <p style="font-size:13px;color:#666">El enlace es válido por 15 minutos. Si no pediste este acceso, ignora este correo.</p>
          <p style="font-size:13px;color:#666">Alonso López · Asesor en alternativas de salida inmobiliaria · <a href="https://alonsolopez.cl" style="color:#666">alonsolopez.cl</a></p>
        </div>`,
    });
  }

  return json({ ok: true });
}
