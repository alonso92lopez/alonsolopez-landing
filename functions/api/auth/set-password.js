// POST /api/auth/set-password  { t, password }
// Canjea el link de invitación (7 días) por la contraseña de la casa.
// Deja la casa en Estado=Activa. Sirve también para resetear (re-invitar).

import { json, readJson } from '../../_lib/http.js';
import { notionGetPage, notionUpdatePage, rt, val } from '../../_lib/notion.js';
import { hashPassword } from '../../_lib/password.js';
import { verifyToken } from '../../_lib/session.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  const password = String(body?.password || '');
  if (password.length < 8) return json({ ok: false, error: 'clave-corta' }, 400);

  const payload = await verifyToken(env, body?.t || '', 'setpw');
  if (!payload?.casaId) return json({ ok: false, error: 'link' }, 401);

  const casa = await notionGetPage(env, payload.casaId);
  if (!casa) return json({ ok: false, error: 'link' }, 401);
  if (val(casa, 'Estado') === 'Suspendida') return json({ ok: false, error: 'link' }, 401);

  const hash = await hashPassword(password);
  const escrito = await notionUpdatePage(env, payload.casaId, {
    'Hash': rt(hash),
    'Estado': { select: { name: 'Activa' } },
  });
  if (!escrito) return json({ ok: false, error: 'notion' }, 500);

  return json({ ok: true, casa: val(casa, 'Nombre') || '' });
}
