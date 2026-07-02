// POST /api/portal/propuesta/responder  { propuesta_id, accion: 'aceptar'|'rechazar', motivo? }
// El lead responde su propuesta desde el portal. Valida ownership (el lead de
// la propuesta debe ser del email en sesión) y que esté 'Enviada' (una sola vez).

import { json, readJson } from '../../../_lib/http.js';
import { notionGetPage, notionUpdatePage, val, rt, hoyISO } from '../../../_lib/notion.js';
import { cambiarEtapa } from '../../../_lib/etapas.js';
import { waAlonso } from '../../../_lib/notify.js';

const ESTADO_CRM_NEGOCIACION = '4 - En negociacion';

export async function onRequestPost(context) {
  const { request, env, data } = context;

  const body = await readJson(request);
  const accion = body?.accion;
  if (!body?.propuesta_id || (accion !== 'aceptar' && accion !== 'rechazar')) {
    return json({ ok: false, error: 'parametros' }, 400);
  }

  const propuesta = await notionGetPage(env, body.propuesta_id);
  if (!propuesta) return json({ ok: false, error: 'propuesta' }, 404);

  const leadId = (val(propuesta, 'Lead') || [])[0];
  if (!leadId) return json({ ok: false, error: 'propuesta' }, 404);

  // Ownership: la propuesta debe pertenecer a un lead del email en sesión.
  const lead = await notionGetPage(env, leadId);
  const emailLead = String(val(lead, 'Email') || '').trim().toLowerCase();
  if (!lead || !emailLead || emailLead !== data.session.email) {
    return json({ ok: false, error: 'propuesta' }, 404);
  }

  if (val(propuesta, 'Estado') !== 'Enviada') {
    return json({ ok: false, error: 'ya-respondida' }, 409);
  }

  const acepta = accion === 'aceptar';
  const motivo = String(body.motivo || '').trim();

  const cambios = {
    'Estado': { select: { name: acepta ? 'Aceptada' : 'Rechazada' } },
    'Fecha respuesta': { date: { start: hoyISO() } },
  };
  if (!acepta && motivo) cambios['Motivo rechazo'] = rt(motivo);
  const escrito = await notionUpdatePage(env, body.propuesta_id, cambios);
  if (!escrito) return json({ ok: false, error: 'notion' }, 500);

  // Etapa del lead (valida que venga de 'Propuesta enviada', guarda fecha,
  // Historial y email de confirmación al lead).
  await cambiarEtapa(env, {
    leadId,
    etapa: acepta ? 'Propuesta aceptada' : 'Propuesta rechazada',
    actor: 'Lead',
    detalle: motivo ? `Motivo: ${motivo}` : '',
  });

  // Al aceptar, el CRM privado avanza a negociación.
  if (acepta) {
    await notionUpdatePage(env, leadId, {
      'Estado': { select: { name: ESTADO_CRM_NEGOCIACION } },
    });
  }

  const titulo = val(propuesta, 'Propuesta') || '';
  const nombre = val(lead, 'Nombre') || '';
  await waAlonso(env, acepta
    ? `✅ Propuesta ACEPTADA\n${titulo}\nLead: ${nombre}\nSiguiente paso: coordinar mandato.`
    : `❌ Propuesta RECHAZADA\n${titulo}\nLead: ${nombre}${motivo ? `\nMotivo: ${motivo}` : ''}`);

  return json({ ok: true, estado: acepta ? 'Aceptada' : 'Rechazada' });
}
