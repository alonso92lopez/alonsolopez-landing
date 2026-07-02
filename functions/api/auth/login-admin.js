// POST /api/auth/login-admin  { password }
// Login del panel admin (/admin/). Un solo usuario: la contraseña vive en la
// env var ADMIN_PASSWORD. Respuesta genérica ante cualquier fallo.

import { json, readJson } from '../../_lib/http.js';
import { signToken, sessionCookie } from '../../_lib/session.js';

const SESION_ADMIN_SEG = 30 * 24 * 3600; // 30 días

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  const password = String(body?.password || '');
  if (!env.ADMIN_PASSWORD || !password || !igualdadConstante(password, env.ADMIN_PASSWORD)) {
    return json({ ok: false, error: 'credenciales' }, 401);
  }

  const session = await signToken(env, { p: 'session', role: 'admin' }, SESION_ADMIN_SEG);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookie(session, SESION_ADMIN_SEG),
    },
  });
}

// Comparación en tiempo constante (evita timing attacks sobre la contraseña).
function igualdadConstante(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
