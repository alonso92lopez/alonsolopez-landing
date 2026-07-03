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

  const leads = filas.map((p) => {
    const publicadaISO = fechaEtapa(p, 'En evaluación');
    return {
      id: p.id,
      nombre: val(p, 'Nombre'),
      telefono: val(p, 'Teléfono'),
      email: val(p, 'Email'),
      comuna: val(p, 'Comuna'),
      tipo: val(p, 'Tipo de propiedad'),
      estadoCrm: val(p, 'Estado'),
      etapa: val(p, 'Etapa portal'),
      faltan: camposFaltantes(p),
      nFotos: (val(p, 'Fotos') || []).length,
      // Palanca: hace cuántos días quedó publicada a las casas (para apurarlas).
      publicadaISO,
      diasPublicada: diasDesde(publicadaISO),
    };
  });

  return json({ ok: true, leads });
}

// Lee la fecha de una etapa desde el blob JSON 'Fechas etapas' del lead.
function fechaEtapa(page, etapa) {
  try {
    const obj = JSON.parse(val(page, 'Fechas etapas') || '{}');
    return obj && obj[etapa] ? obj[etapa] : null;
  } catch {
    return null;
  }
}

// Días enteros entre una fecha ISO (YYYY-MM-DD) y hoy; null si no hay fecha.
function diasDesde(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}
