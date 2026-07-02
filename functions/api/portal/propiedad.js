// POST /api/portal/propiedad — el lead logueado ingresa OTRA propiedad.
// El contacto sale de la sesión (y de su ficha más reciente), no del body.

import { json, readJson } from '../../_lib/http.js';
import { notionQuery, notionCreatePage, val } from '../../_lib/notion.js';
import { waAlonsoYPablo } from '../../_lib/notify.js';
import { propiedadProps, metadatosAlta, mensajeNuevoLead } from '../../_lib/leads.js';
import { cambiarEtapa } from '../../_lib/etapas.js';

export async function onRequestPost(context) {
  const { request, env, data } = context;
  const email = data.session.email;

  const body = await readJson(request);
  if (!body || !body.tipo) return json({ ok: false, error: 'parametros' }, 400);

  // Contacto desde su ficha existente (el portal exige tener al menos una).
  const previos = await notionQuery(env, env.NOTION_LEADS_DB_ID, {
    property: 'Email', email: { equals: email },
  });
  if (!previos.length) return json({ ok: false, error: 'sesion' }, 401);
  const ultimo = previos.sort((a, b) => String(a.created_time).localeCompare(String(b.created_time))).at(-1);
  const nombre = val(ultimo, 'Nombre') || '';
  const telefono = val(ultimo, 'Teléfono') || '';

  const props = {
    'Nombre': { title: [{ text: { content: nombre } }] },
    ...(telefono ? { 'Teléfono': { phone_number: telefono } } : {}),
    'Email': { email },
    ...propiedadProps(body),
    ...metadatosAlta('Portal'),
  };

  const creada = await notionCreatePage(env, env.NOTION_LEADS_DB_ID, props);
  if (!creada) return json({ ok: false }, 500);

  await cambiarEtapa(env, {
    leadId: creada.id, etapa: 'Recibida', actor: 'Lead',
    detalle: 'Alta desde el portal', notificarEmail: false,
  });

  await waAlonsoYPablo(env, mensajeNuevoLead(
    { ...body, nombre, telefono, email },
    '🏠 Nueva propiedad (portal) — alonsolopez.cl',
  ));

  return json({ ok: true, id: creada.id });
}
