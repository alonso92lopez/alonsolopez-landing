// Helpers HTTP compartidos por todas las Pages Functions.
// El prefijo _ evita que Cloudflare enrute este directorio como endpoint.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Lee el body JSON de un request; devuelve null si no es JSON válido.
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
