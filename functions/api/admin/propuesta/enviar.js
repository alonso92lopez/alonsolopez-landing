// POST /api/admin/propuesta/enviar  { propuesta_id }
// Gate 2: marca una propuesta Borrador como Enviada, mueve la etapa del lead
// a 'Propuesta enviada' (email al lead vía cambiarEtapa) y avisa a Alonso.

import { json, readJson } from '../../../_lib/http.js';
import { notionGetPage, notionUpdatePage, val, hoyISO } from '../../../_lib/notion.js';
import { cambiarEtapa } from '../../../_lib/etapas.js';
import { waAlonso } from '../../../_lib/notify.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  if (!body?.propuesta_id) return json({ ok: false, error: 'parametros' }, 400);

  const propuesta = await notionGetPage(env, body.propuesta_id);
  if (!propuesta) return json({ ok: false, error: 'propuesta' }, 404);

  const estado = val(propuesta, 'Estado');
  if (estado !== 'Borrador') {
    return json({ ok: false, error: 'estado', mensaje: `La propuesta está '${estado}', no 'Borrador'` }, 409);
  }
  const leadId = (val(propuesta, 'Lead') || [])[0];
  if (!leadId) return json({ ok: false, error: 'sin-lead' }, 400);
  if (!(val(propuesta, 'Resumen') || '').trim()) {
    return json({ ok: false, error: 'sin-resumen', mensaje: 'Redacta el Resumen en Notion antes de enviar' }, 400);
  }

  const titulo = val(propuesta, 'Propuesta') || '';
  const escrito = await notionUpdatePage(env, body.propuesta_id, {
    'Estado': { select: { name: 'Enviada' } },
    'Fecha envío': { date: { start: hoyISO() } },
  });
  if (!escrito) return json({ ok: false, error: 'notion' }, 500);

  const etapa = await cambiarEtapa(env, {
    leadId, etapa: 'Propuesta enviada', actor: 'Alonso',
    detalle: `Propuesta: ${titulo}`,
  });

  await waAlonso(env, `📤 Propuesta enviada\n${titulo}\nEl lead ya puede verla en su portal.`);

  return json({ ok: true, etapa });
}
