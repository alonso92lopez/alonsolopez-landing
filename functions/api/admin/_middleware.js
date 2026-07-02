// Middleware de /api/admin/*: exige Bearer ADMIN_API_TOKEN.
// Lo usan los CLIs de comercial/portal (api_admin.py). No hay UI admin.

import { json } from '../../_lib/http.js';

export async function onRequest(context) {
  const { request, env } = context;
  const esperado = env.ADMIN_API_TOKEN || '';
  const recibido = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!esperado || !recibido || !igualdadConstante(recibido, esperado)) {
    return json({ ok: false, error: 'auth' }, 401);
  }
  return context.next();
}

// Comparación en tiempo constante (evita timing attacks sobre el token).
function igualdadConstante(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
