// Middleware de /api/admin/*: exige Bearer ADMIN_API_TOKEN (los CLIs de
// comercial/portal vía api_admin.py) O sesión de admin por cookie (el panel
// /admin/, que entra con ADMIN_PASSWORD en /api/auth/login-admin).

import { json } from '../../_lib/http.js';
import { getSession } from '../../_lib/session.js';

export async function onRequest(context) {
  const { request, env } = context;

  const esperado = env.ADMIN_API_TOKEN || '';
  const recibido = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (esperado && recibido && igualdadConstante(recibido, esperado)) {
    return context.next();
  }

  const session = await getSession(request, env);
  if (session && session.role === 'admin') {
    context.data.session = session;
    return context.next();
  }

  return json({ ok: false, error: 'auth' }, 401);
}

// Comparación en tiempo constante (evita timing attacks sobre el token).
function igualdadConstante(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
