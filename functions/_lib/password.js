// Hash de contraseñas con PBKDF2-SHA256 (WebCrypto: bcrypt no está disponible
// en Workers). Formato guardado: pbkdf2$<iteraciones>$<salt b64>$<hash b64>.
// Las iteraciones viven en el string: se pueden subir/bajar sin romper hashes viejos.

const ITERACIONES = 100000;

function b64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function derivar(password, salt, iteraciones) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iteraciones },
    key, 256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(password, salt, ITERACIONES);
  return `pbkdf2$${ITERACIONES}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password, guardado) {
  const partes = String(guardado || '').split('$');
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false;
  const iteraciones = parseInt(partes[1], 10);
  if (!iteraciones || iteraciones > 500000) return false;
  let salt, esperado;
  try {
    salt = fromB64(partes[2]);
    esperado = fromB64(partes[3]);
  } catch {
    return false;
  }
  const hash = await derivar(password, salt, iteraciones);
  if (hash.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ esperado[i];
  return diff === 0;
}
