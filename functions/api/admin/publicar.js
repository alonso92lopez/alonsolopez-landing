// POST /api/admin/publicar  { lead_id, forzar? }
// Publica un lead validado a las casas de remate (gate 1 desde el panel /admin/).
// Misma lógica que comercial/portal/publicar.py, vía _lib/publicar.js.

import { json, readJson } from '../../_lib/http.js';
import { publicarLead } from '../../_lib/publicar.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  if (!body?.lead_id) return json({ ok: false, error: 'parametros' }, 400);

  const resultado = await publicarLead(env, body.lead_id, { forzar: !!body.forzar });
  return json(resultado, resultado.ok ? 200 : (resultado.status || 500));
}
