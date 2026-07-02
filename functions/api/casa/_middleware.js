// Middleware de /api/casa/*: exige sesión de casa (role=casa) y revalida
// contra su fila en Notion en cada request (Estado=Activa) — así suspender
// una casa surte efecto de inmediato, sin base de sesiones.

import { json } from '../../_lib/http.js';
import { getSession } from '../../_lib/session.js';
import { notionGetPage, val } from '../../_lib/notion.js';

export async function onRequest(context) {
  const session = await getSession(context.request, context.env);
  if (!session || session.role !== 'casa' || !session.casaId) {
    return json({ ok: false, error: 'sesion' }, 401);
  }

  const fila = await notionGetPage(context.env, session.casaId);
  if (!fila || val(fila, 'Estado') !== 'Activa') {
    return json({ ok: false, error: 'suspendida' }, 403);
  }

  context.data.session = session;
  context.data.casa = val(fila, 'Nombre') || session.casa || '';
  return context.next();
}
