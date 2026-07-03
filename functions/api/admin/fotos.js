// POST /api/admin/fotos  (multipart: lead_id + campo "fotos")
// Alonso sube fotos a nombre de un lead (respaldo: el lead se las manda por
// WhatsApp y él las carga). Gateado por el middleware admin (sesión o Bearer).
// Se permite en cualquier etapa. Atajo sin código equivalente: arrastrar las
// fotos directo a la ficha del lead en Notion (propiedad "Fotos").

import { json } from '../../_lib/http.js';
import { notionGetPage, notionUpdatePage, val, rawFiles, notionUpload, filesAppendProp } from '../../_lib/notion.js';

const MAX_FOTOS = 20;
const MAX_BYTES = 10 * 1024 * 1024;

export async function onRequestPost(context) {
  const { request, env } = context;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'parametros' }, 400);
  }

  const leadId = String(form.get('lead_id') || '').trim();
  if (!leadId) return json({ ok: false, error: 'parametros' }, 400);

  const lead = await notionGetPage(env, leadId);
  if (!lead) return json({ ok: false, error: 'lead' }, 404);

  const archivos = form.getAll('fotos').filter((f) => f && typeof f.arrayBuffer === 'function');
  if (!archivos.length) return json({ ok: false, error: 'sin-archivos' }, 400);

  const existentes = rawFiles(lead, 'Fotos');
  if (existentes.length + archivos.length > MAX_FOTOS) {
    return json({ ok: false, error: 'limite', max: MAX_FOTOS }, 409);
  }

  const nuevas = [];
  for (const f of archivos) {
    if (!String(f.type || '').startsWith('image/')) return json({ ok: false, error: 'no-imagen' }, 400);
    if (f.size > MAX_BYTES) return json({ ok: false, error: 'muy-grande', max: MAX_BYTES }, 413);
    const id = await notionUpload(env, f.name || `foto-${nuevas.length + 1}.jpg`, await f.arrayBuffer(), f.type);
    if (!id) return json({ ok: false, error: 'upload' }, 502);
    nuevas.push({ id, name: f.name || `foto-${nuevas.length + 1}.jpg` });
  }

  const escrito = await notionUpdatePage(env, leadId, { 'Fotos': filesAppendProp(existentes, nuevas) });
  if (!escrito) return json({ ok: false }, 500);

  const fresco = await notionGetPage(env, leadId);
  return json({ ok: true, fotos: val(fresco, 'Fotos') || [] });
}
