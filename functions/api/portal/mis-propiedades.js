// GET /api/portal/mis-propiedades
// Todas las propiedades (filas de Leads) del usuario logueado, con su etapa,
// fechas de cada etapa y la propuesta comercial si existe.
//
// REGLA DURA: este endpoint jamás lee la base Proyecciones ni expone montos,
// nombres de casas ni nada que no haya pasado por una Propuesta enviada.

import { json } from '../../_lib/http.js';
import { notionQuery, val } from '../../_lib/notion.js';
import { leadWhitelist } from '../estado.js';

// Debe coincidir con EDITABLES en propiedad/[id].js (guardia del lado servidor).
const ETAPAS_EDITABLES = ['Recibida', 'Validación'];

export async function onRequestGet(context) {
  const { env, data } = context;
  const email = data.session.email;

  const leads = await notionQuery(env, env.NOTION_LEADS_DB_ID, {
    property: 'Email', email: { equals: email },
  });
  if (!leads.length) return json({ ok: true, propiedades: [] });

  // Propuestas visibles (nunca Borrador) de cualquiera de sus leads, en 1 query.
  const propuestasPorLead = await buscarPropuestas(env, leads.map((l) => l.id));

  const propiedades = leads.map((lead) => {
    const base = leadWhitelist(lead);
    const propuesta = propuestasPorLead.get(lead.id) || null;
    const etapa = base.etapa || 'Recibida';
    return {
      id: lead.id,
      ...base,
      creada: lead.created_time || null,
      fechasEtapas: parseFechas(val(lead, 'Fechas etapas')),
      propuesta,
      puedeEditar: ETAPAS_EDITABLES.includes(etapa),
      puedeResponder: !!propuesta && propuesta.estado === 'Enviada',
    };
  });

  propiedades.sort((a, b) => String(b.creada).localeCompare(String(a.creada)));
  return json({ ok: true, email, propiedades });
}

async function buscarPropuestas(env, leadIds) {
  const mapa = new Map();
  if (!env.NOTION_PROPUESTAS_DB_ID) return mapa;

  const filas = await notionQuery(env, env.NOTION_PROPUESTAS_DB_ID, {
    and: [
      { or: leadIds.map((id) => ({ property: 'Lead', relation: { contains: id } })) },
      { property: 'Estado', select: { does_not_equal: 'Borrador' } },
    ],
  });

  for (const p of filas) {
    const relacion = (val(p, 'Lead') || [])[0];
    if (!relacion) continue;
    // Si hubiera más de una propuesta visible por lead, gana la más reciente.
    const existente = mapa.get(relacion);
    const propuesta = {
      id: p.id,
      estado:         val(p, 'Estado'),
      resumen:        val(p, 'Resumen'),
      condiciones:    val(p, 'Condiciones'),
      monto:          val(p, 'Monto ofrecido'),
      moneda:         val(p, 'Moneda'),
      comision:       val(p, 'Comisión %'),
      plazo:          val(p, 'Plazo estimado'),
      vigencia:       val(p, 'Vigencia hasta'),
      fechaEnvio:     val(p, 'Fecha envío'),
      fechaRespuesta: val(p, 'Fecha respuesta'),
    };
    if (!existente || String(propuesta.fechaEnvio) > String(existente.fechaEnvio)) {
      mapa.set(relacion, propuesta);
    }
  }
  return mapa;
}

function parseFechas(texto) {
  if (!texto) return {};
  try {
    const obj = JSON.parse(texto);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}
