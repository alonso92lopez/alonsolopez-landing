// Middleware de /api/portal/*: exige sesión de propietario (role=lead).
// Deja la sesión verificada en context.data.session para los handlers.

import { json } from '../../_lib/http.js';
import { getSession } from '../../_lib/session.js';

export async function onRequest(context) {
  const session = await getSession(context.request, context.env);
  if (!session || session.role !== 'lead' || !session.email) {
    return json({ ok: false, error: 'sesion' }, 401);
  }
  context.data.session = session;
  return context.next();
}
