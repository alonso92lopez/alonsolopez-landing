// POST   /api/portal/fotos/<id>  — el lead sube fotos de su propiedad (multipart, campo "fotos").
// DELETE /api/portal/fotos/<id>  — el lead quita una foto por índice.
//
// Subir se permite en CUALQUIER etapa (agregar fotos tarde es justo el caso de uso:
// el lead se demora, publica igual, y las fotos aparecen a las casas apenas llegan).
// Borrar se restringe a Recibida/Validación, igual que la edición de datos.

import { json, readJson } from '../../../_lib/http.js';
import { notionGetPage, notionUpdatePage, val, rawFiles, notionUpload, filesAppendProp } from '../../../_lib/notion.js';

const EDITABLES = ['Recibida', 'Validación'];
const MAX_FOTOS = 20;              // tope total por propiedad
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB por archivo (el cliente ya reduce a <1MB)

// Verifica dueño por email de sesión; devuelve el lead o una respuesta de error.
async function cargarPropia(env, params, session) {
  const lead = await notionGetPage(env, params.id);
  if (!lead) return { error: json({ ok: false, error: 'propiedad' }, 404) };
  const emailLead = String(val(lead, 'Email') || '').trim().toLowerCase();
  if (!emailLead || emailLead !== session.email) {
    return { error: json({ ok: false, error: 'propiedad' }, 404) };
  }
  return { lead };
}

export async function onRequestPost(context) {
  const { request, env, data, params } = context;

  const { lead, error } = await cargarPropia(env, params, data.session);
  if (error) return error;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'parametros' }, 400);
  }
  const archivos = form.getAll('fotos').filter((f) => f && typeof f.arrayBuffer === 'function');
  if (!archivos.length) return json({ ok: false, error: 'sin-archivos' }, 400);

  const existentes = rawFiles(lead, 'Fotos');
  if (existentes.length + archivos.length > MAX_FOTOS) {
    return json({ ok: false, error: 'limite', max: MAX_FOTOS }, 409);
  }

  const nuevas = [];
  for (const f of archivos) {
    if (!String(f.type || '').startsWith('image/')) {
      return json({ ok: false, error: 'no-imagen' }, 400);
    }
    if (f.size > MAX_BYTES) {
      return json({ ok: false, error: 'muy-grande', max: MAX_BYTES }, 413);
    }
    const bytes = await f.arrayBuffer();
    const nombre = f.name || `foto-${nuevas.length + 1}.jpg`;
    const id = await notionUpload(env, nombre, bytes, f.type);
    if (!id) return json({ ok: false, error: 'upload' }, 502);
    nuevas.push({ id, name: nombre });
  }

  const escrito = await notionUpdatePage(env, params.id, { 'Fotos': filesAppendProp(existentes, nuevas) });
  if (!escrito) return json({ ok: false }, 500);

  // Releer para devolver URLs frescas y que el portal repinte la galería.
  const fresco = await notionGetPage(env, params.id);
  return json({ ok: true, fotos: val(fresco, 'Fotos') || [] });
}

export async function onRequestDelete(context) {
  const { request, env, data, params } = context;

  const { lead, error } = await cargarPropia(env, params, data.session);
  if (error) return error;

  const etapa = val(lead, 'Etapa portal') || 'Recibida';
  if (!EDITABLES.includes(etapa)) {
    return json({ ok: false, error: 'bloqueada', etapa }, 409);
  }

  const body = await readJson(request);
  const idx = body && Number.isInteger(body.index) ? body.index : -1;
  const files = rawFiles(lead, 'Fotos');
  if (idx < 0 || idx >= files.length) return json({ ok: false, error: 'indice' }, 400);

  const quedan = files.filter((_, i) => i !== idx);
  const escrito = await notionUpdatePage(env, params.id, { 'Fotos': { files: quedan } });
  if (!escrito) return json({ ok: false }, 500);

  const fresco = await notionGetPage(env, params.id);
  return json({ ok: true, fotos: val(fresco, 'Fotos') || [] });
}
