// GET /api/auth/callback?t=TOKEN
// Canjea el magic link por una sesión (cookie firmada) y redirige al portal.

import { verifyToken, signToken, sessionCookie, SESION_LEAD_SEG } from '../../_lib/session.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const t = url.searchParams.get('t') || '';

  const payload = await verifyToken(env, t, 'magic');
  if (!payload) {
    return Response.redirect(`${url.origin}/portal/?e=link`, 302);
  }

  const session = await signToken(
    env, { p: 'session', role: 'lead', email: payload.email }, SESION_LEAD_SEG,
  );
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${url.origin}/portal/`,
      'Set-Cookie': sessionCookie(session, SESION_LEAD_SEG),
    },
  });
}
