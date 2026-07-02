// GET /api/admin/leads
// Lista de leads para el panel admin: contacto + etapa + semáforo de campos
// requeridos para publicar. Solo para Alonso (middleware admin).

import { json } from '../../_lib/http.js';
import { notionQuery, val } from '../../_lib/notion.js';
import { camposFaltantes } from '../../_lib/publicar.js';

export async function onRequestGet(context) {
  const { env } = context;

  const filas = await notionQuery(
    env, env.NOTION_LEADS_DB_ID, undefined,
    [{ timestamp: 'created_time', direction: 'descending' }],
  );

  const leads = filas.map((p) => ({
    id: p.id,
    nombre: val(p, 'Nombre'),
    telefono: val(p, 'Teléfono'),
    email: val(p, 'Email'),
    comuna: val(p, 'Comuna'),
    tipo: val(p, 'Tipo de propiedad'),
    estadoCrm: val(p, 'Estado'),
    etapa: val(p, 'Etapa portal'),
    faltan: camposFaltantes(p),
  }));

  return json({ ok: true, leads });
}
