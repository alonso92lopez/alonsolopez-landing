// POST /api/auth/logout — cierra la sesión (borra la cookie).

import { json } from '../../_lib/http.js';
import { clearSessionCookie } from '../../_lib/session.js';

export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  });
}

export async function onRequestGet() {
  return json({ ok: false, error: 'metodo' }, 405);
}
