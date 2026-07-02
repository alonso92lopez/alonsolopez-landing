// POST /submit — form público de la landing: crea el lead en Notion,
// registra la etapa inicial 'Recibida' y avisa por WhatsApp.

import { json, readJson } from './_lib/http.js';
import { notionCreatePage } from './_lib/notion.js';
import { waAlonsoYPablo } from './_lib/notify.js';
import { contactoProps, propiedadProps, metadatosAlta, mensajeNuevoLead } from './_lib/leads.js';
import { cambiarEtapa } from './_lib/etapas.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const data = await readJson(request);
  if (!data) return json({ ok: false }, 400);

  const props = {
    ...contactoProps(data),
    ...propiedadProps(data),
    ...metadatosAlta('Formulario web'),
  };

  const creada = await notionCreatePage(env, env.NOTION_LEADS_DB_ID, props);
  if (!creada) return json({ ok: false }, 500);

  // Etapa inicial por la máquina de estados (fecha + Historial; sin email).
  await cambiarEtapa(env, {
    leadId: creada.id, etapa: 'Recibida', actor: 'Lead',
    detalle: 'Alta por formulario web', notificarEmail: false,
  });

  await waAlonsoYPablo(env, mensajeNuevoLead(data, '🏠 Nuevo lead — alonsolopez.cl'));

  return json({ ok: true });
}
