// POST /api/casa/proyeccion — versión autenticada por sesión del portal de casas.
// Misma lógica que /api/proyeccion, con la casa desde la cookie (no del body).

import { json, readJson } from '../../_lib/http.js';
import { guardarProyeccion } from '../proyeccion.js';

export async function onRequestPost(context) {
  const { request, env, data } = context;
  const body = await readJson(request);
  if (!body) return json({ ok: false }, 400);
  return guardarProyeccion(env, data.casa, body);
}
