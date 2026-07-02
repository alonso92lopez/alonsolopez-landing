// PUT /api/portal/propiedad/<id> — el lead corrige los datos de su propiedad.
// Solo mientras la ficha está en Recibida/Validación: desde 'En evaluación'
// lo publicado debe coincidir con lo que ven las casas -> 409.

import { json, readJson } from '../../../_lib/http.js';
import { notionGetPage, notionUpdatePage, val } from '../../../_lib/notion.js';
import { waAlonso } from '../../../_lib/notify.js';
import { propiedadProps } from '../../../_lib/leads.js';

const EDITABLES = ['Recibida', 'Validación'];

export async function onRequestPut(context) {
  const { request, env, data, params } = context;

  const body = await readJson(request);
  if (!body) return json({ ok: false, error: 'parametros' }, 400);

  const lead = await notionGetPage(env, params.id);
  if (!lead) return json({ ok: false, error: 'propiedad' }, 404);

  // Ownership por email de sesión.
  const emailLead = String(val(lead, 'Email') || '').trim().toLowerCase();
  if (!emailLead || emailLead !== data.session.email) {
    return json({ ok: false, error: 'propiedad' }, 404);
  }

  const etapa = val(lead, 'Etapa portal') || 'Recibida';
  if (!EDITABLES.includes(etapa)) {
    return json({ ok: false, error: 'bloqueada', etapa }, 409);
  }

  const props = propiedadProps(body);
  if (!Object.keys(props).length) return json({ ok: false, error: 'parametros' }, 400);

  const escrito = await notionUpdatePage(env, params.id, props);
  if (!escrito) return json({ ok: false }, 500);

  // En Validación, Alonso ya pudo haber revisado la ficha: que sepa que cambió.
  if (etapa === 'Validación') {
    const nombre = val(lead, 'Nombre') || '';
    await waAlonso(env, `✏️ Lead editó su ficha durante la validación\n${nombre}\nRevisa los datos antes de publicar.`);
  }

  return json({ ok: true });
}
