// POST /api/proyeccion
// Recibe la proyección de una casa de remate y la guarda en la base Proyecciones de Notion.
// Valida el token (CASA_TOKENS) y avisa a Alonso por WhatsApp.

import { json, readJson } from '../_lib/http.js';
import { notionCreatePage, num, hoyISO } from '../_lib/notion.js';
import { waAlonso } from '../_lib/notify.js';
import { resolverCasa } from './propiedades.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  if (!body) return json({ ok: false }, 400);

  const casa = resolverCasa(env, body.t || '');
  if (!casa) return json({ ok: false, error: 'token' }, 401);

  return guardarProyeccion(env, casa, body);
}

// Guarda la proyección y notifica. Compartido con el portal autenticado de casas.
export async function guardarProyeccion(env, casa, body) {
  if (!body.propiedad_id) return json({ ok: false, error: 'propiedad' }, 400);

  const codigo = body.codigo || 'PROP';
  const props = {
    'Proyección':    { title: [{ text: { content: `${codigo} — ${casa}` } }] },
    'Propiedad':     { relation: [{ id: body.propiedad_id }] },
    'Casa de remate':{ select: { name: casa } },
    'Fecha':         { date: { start: hoyISO() } },
  };
  if (body.resultado)   props['Resultado'] = { select: { name: body.resultado } };
  num(props, 'Monto mínimo', body.monto_minimo);
  num(props, 'Monto proyectado', body.monto_proyectado);
  num(props, 'Costo adicional', body.costo_adicional);
  if (body.moneda)       props['Moneda'] = { select: { name: body.moneda } };
  if (body.moneda_costo) props['Moneda costo'] = { select: { name: body.moneda_costo } };
  if (body.condiciones)  props['Condiciones'] = { rich_text: [{ text: { content: String(body.condiciones) } }] };

  const creada = await notionCreatePage(env, env.NOTION_PROYECCIONES_DB_ID, props);
  if (!creada) return json({ ok: false }, 500);

  const moneda = body.moneda || '';
  const lineas = [`📊 Nueva proyección — ${casa}`, `${codigo}`];
  if (body.resultado === 'No califica') {
    lineas.push('Resultado: NO CALIFICA');
    if (body.condiciones) lineas.push(`Motivo: ${body.condiciones}`);
  } else {
    lineas.push(`Mínimo:     ${fmt(body.monto_minimo)} ${moneda}`);
    lineas.push(`Proyectado: ${fmt(body.monto_proyectado)} ${moneda}`);
    if (body.costo_adicional && Number(body.costo_adicional) > 0) {
      lineas.push(`Costo adicional: ${fmt(body.costo_adicional)} ${body.moneda_costo || ''}`);
    }
  }
  await waAlonso(env, lineas.join('\n'));

  return json({ ok: true });
}

function fmt(v) {
  if (v === '' || v === null || v === undefined) return '—';
  return Number(v).toLocaleString('es-CL');
}
