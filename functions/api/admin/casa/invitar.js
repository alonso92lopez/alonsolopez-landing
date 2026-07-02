// POST /api/admin/casa/invitar  { casa_id }
// Envía a la casa el email con su link para crear contraseña (válido 7 días).
// Devuelve también el link por si Alonso prefiere mandarlo a mano.

import { json, readJson } from '../../../_lib/http.js';
import { notionGetPage, val } from '../../../_lib/notion.js';
import { sendEmail } from '../../../_lib/notify.js';
import { signToken, SETPW_LINK_SEG } from '../../../_lib/session.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  if (!body?.casa_id) return json({ ok: false, error: 'parametros' }, 400);

  const casa = await notionGetPage(env, body.casa_id);
  if (!casa) return json({ ok: false, error: 'casa' }, 404);

  const nombre = val(casa, 'Nombre') || '';
  const email = val(casa, 'Email');
  if (!email) return json({ ok: false, error: 'sin-email' }, 400);

  const token = await signToken(env, { p: 'setpw', casaId: casa.id }, SETPW_LINK_SEG);
  const link = `${new URL(request.url).origin}/casas/clave/?t=${encodeURIComponent(token)}`;

  const enviado = await sendEmail(env, {
    to: email,
    subject: `Tu acceso al portal de propiedades — Alonso López`,
    text: `Hola,\n\nCreamos una cuenta para ${nombre} en nuestro portal de propiedades en cotización.\nDefine tu contraseña con este enlace (válido por 7 días):\n${link}\n\nDespués entra siempre desde https://alonsolopez.cl/casas/ con tu email y contraseña.\n\nAlonso López · alonsolopez.cl`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <p style="font-size:15px">Hola,</p>
        <p style="font-size:15px">Creamos una cuenta para <strong>${nombre}</strong> en nuestro portal de propiedades en cotización.</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-size:15px;display:inline-block">Crear mi contraseña</a>
        </p>
        <p style="font-size:13px;color:#666">El enlace es válido por 7 días. Después entra siempre desde <a href="https://alonsolopez.cl/casas/" style="color:#666">alonsolopez.cl/casas</a> con tu email y contraseña.</p>
        <p style="font-size:13px;color:#666">Alonso López · Asesor en alternativas de salida inmobiliaria</p>
      </div>`,
  });

  return json({ ok: true, casa: nombre, email, link, emailEnviado: enviado });
}
