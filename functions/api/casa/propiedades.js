// GET /api/casa/propiedades — versión autenticada por sesión del portal de casas.
// Misma vista anonimizada que /api/propiedades?t=, con la casa desde la cookie.

import { json } from '../../_lib/http.js';
import { listarPropiedadesParaCasa } from '../propiedades.js';

export async function onRequestGet(context) {
  const { env, data } = context;
  const propiedades = await listarPropiedadesParaCasa(env, data.casa);
  return json({ ok: true, casa: data.casa, propiedades });
}
