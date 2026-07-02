// Tokens firmados y sesiones por cookie, sin base de datos de sesiones.
//
// Formato de token: base64url(JSON payload) + '.' + base64url(HMAC-SHA256)
// firmado con SESSION_SECRET. El payload siempre lleva:
//   p   — propósito ('session' | 'magic' | 'setpw'): un magic link jamás sirve de sesión
//   exp — expiración en epoch segundos
//
// Sesión de lead:  { p:'session', role:'lead', email }
// Sesión de casa:  { p:'session', role:'casa', casaId, casa }
// Magic link lead: { p:'magic', email }
// Set-password:    { p:'setpw', casaId }

const COOKIE = 'al_session';
export const SESION_LEAD_SEG = 30 * 24 * 3600; // 30 días
export const SESION_CASA_SEG = 30 * 24 * 3600;
export const MAGIC_LINK_SEG = 15 * 60;         // 15 minutos
export const SETPW_LINK_SEG = 7 * 24 * 3600;   // 7 días

// --- base64url ---

function b64urlEncode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// --- HMAC ---

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

export async function signToken(env, payload, maxAgeSeconds) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds };
  const data = b64urlEncode(new TextEncoder().encode(JSON.stringify(body)));
  const key = await hmacKey(env.SESSION_SECRET);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64urlEncode(new Uint8Array(sig))}`;
}

// Devuelve el payload si la firma es válida y no expiró; si no, null.
export async function verifyToken(env, token, purpose) {
  if (!token || !env.SESSION_SECRET) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let sigBytes;
  try { sigBytes = b64urlDecode(sig); } catch { return null; }
  const key = await hmacKey(env.SESSION_SECRET);
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!ok) return null;
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(b64urlDecode(data))); } catch { return null; }
  if (payload.p !== purpose) return null;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// --- cookies ---

export function sessionCookie(token, maxAgeSeconds) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function cookieValue(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

// Sesión del request (payload verificado) o null.
export async function getSession(request, env) {
  return verifyToken(env, cookieValue(request), 'session');
}
