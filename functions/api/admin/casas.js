// GET /api/admin/casas
// Lista de casas de remate para el panel admin, con el link de su portal:
// - casas legacy (env CASA_TOKENS): link ?t= — abre su vista exacta sin login
// - casas con cuenta (base Casas): email + estado (entran con contraseña)
// Solo para Alonso (middleware admin). Los tokens son de las casas: no salen
// de aquí hacia nadie más.

import { json } from '../../_lib/http.js';
import { notionQuery, val } from '../../_lib/notion.js';

export async function onRequestGet(context) {
  const { env } = context;

  // token -> nombre (legacy)
  let mapa = {};
  try { mapa = JSON.parse(env.CASA_TOKENS || '{}'); } catch { mapa = {}; }
  const porNombre = {};
  for (const [token, nombre] of Object.entries(mapa)) {
    porNombre[nombre] = { nombre, link: `https://alonsolopez.cl/casas/?t=${token}` };
  }

  // casas con cuenta (pueden coexistir con su token durante la transición)
  if (env.NOTION_CASAS_DB_ID) {
    const filas = await notionQuery(env, env.NOTION_CASAS_DB_ID);
    for (const f of filas) {
      const nombre = val(f, 'Nombre') || '(sin nombre)';
      porNombre[nombre] = {
        ...(porNombre[nombre] || { nombre }),
        email: val(f, 'Email'),
        estado: val(f, 'Estado'),
        ultimoAcceso: val(f, 'Último acceso'),
      };
    }
  }

  const casas = Object.values(porNombre).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return json({ ok: true, casas });
}
