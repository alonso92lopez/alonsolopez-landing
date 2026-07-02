// POST /api/admin/etapa  { lead_id, etapa, actor?, detalle?, notificar? }
// Único endpoint para mover la etapa de un lead. Lo llaman los CLIs
// (portal_lead.py, publicar.py, propuesta.py) vía api_admin.py.

import { json, readJson } from '../../_lib/http.js';
import { cambiarEtapa } from '../../_lib/etapas.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  if (!body?.lead_id || !body?.etapa) return json({ ok: false, error: 'parametros' }, 400);

  const resultado = await cambiarEtapa(env, {
    leadId: body.lead_id,
    etapa: body.etapa,
    actor: body.actor || 'Alonso',
    detalle: body.detalle || '',
    notificarEmail: body.notificar !== false,
  });

  return json(resultado, resultado.ok ? 200 : (resultado.status || 500));
}
