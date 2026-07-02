// POST /api/auth/login-casa  { email, password }
// Login de casa de remate. Respuesta genérica ante cualquier fallo
// (no distingue email inexistente de contraseña mala).

import { json, readJson } from '../../_lib/http.js';
import { notionQuery, notionUpdatePage, val, hoyISO } from '../../_lib/notion.js';
import { verifyPassword } from '../../_lib/password.js';
import { signToken, sessionCookie, SESION_CASA_SEG } from '../../_lib/session.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!email || !password) return json({ ok: false, error: 'credenciales' }, 401);

  const filas = await notionQuery(env, env.NOTION_CASAS_DB_ID, {
    property: 'Email', email: { equals: email },
  });
  const casa = filas[0];
  if (!casa) return json({ ok: false, error: 'credenciales' }, 401);
  if (val(casa, 'Estado') !== 'Activa') return json({ ok: false, error: 'credenciales' }, 401);

  const okPass = await verifyPassword(password, val(casa, 'Hash'));
  if (!okPass) return json({ ok: false, error: 'credenciales' }, 401);

  await notionUpdatePage(env, casa.id, {
    'Último acceso': { date: { start: hoyISO() } },
  });

  const nombre = val(casa, 'Nombre') || '';
  const session = await signToken(
    env, { p: 'session', role: 'casa', casaId: casa.id, casa: nombre }, SESION_CASA_SEG,
  );
  return new Response(JSON.stringify({ ok: true, casa: nombre }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookie(session, SESION_CASA_SEG),
    },
  });
}
