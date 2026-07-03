// GET /api/estado?t=TOKEN
// Portal de estado del propietario: devuelve SOLO en qué etapa va su proceso.
// Busca el lead por su 'Token portal' en la base de Leads y expone una whitelist
// estricta: nunca montos, proyecciones, casas de remate ni pretensión.

import { json } from '../_lib/http.js';
import { notionQuery, val } from '../_lib/notion.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const token = (new URL(request.url).searchParams.get('t') || '').trim();
  // Sin token no se consulta: evita que un filtro equals:'' matchee leads sin link.
  if (!token) return json({ ok: false, error: 'token' }, 401);

  const leads = await notionQuery(env, env.NOTION_LEADS_DB_ID, {
    property: 'Token portal', rich_text: { equals: token },
  });
  if (!leads.length) return json({ ok: false, error: 'token' }, 401);

  return json({ ok: true, ...leadWhitelist(leads[0]) });
}

// Whitelist: lo único que el propietario puede ver de su propio lead.
// Incluye las características físicas (los MISMOS parámetros con los que las casas
// evalúan), para que sepa con qué datos se está cotizando. NUNCA teléfono, email,
// pretensión de venta ni rol SII. Compartida con el portal autenticado del lead.
export function leadWhitelist(lead) {
  const nombreCompleto = val(lead, 'Nombre') || '';
  return {
    nombre:      primerNombre(nombreCompleto),
    tipo:        val(lead, 'Tipo de propiedad'),
    comuna:      val(lead, 'Comuna'),
    region:      val(lead, 'Región'),
    direccion:   val(lead, 'Dirección'),
    etapa:       val(lead, 'Etapa portal'),     // puede ser null -> el front asume la 1ª
    mensaje:     val(lead, 'Mensaje portal'),
    actualizado: lead.last_edited_time || null,
    fotos:       val(lead, 'Fotos') || [],      // URLs de las fotos que subió el propietario

    // Datos de la propiedad (parámetros de la cotización):
    m2:                    val(lead, 'M²'),
    m2_construidos:        val(lead, 'M² construidos'),
    m2_utiles:             val(lead, 'M² útiles'),
    m2_totales:            val(lead, 'M² totales'),
    m2_ponderados:         val(lead, 'M² ponderados'),
    habitaciones:          val(lead, 'Habitaciones'),
    banos:                 val(lead, 'Baños'),
    estacionamiento:       val(lead, 'Estacionamiento'),
    bodega:                val(lead, 'Bodega'),
    balcon:                val(lead, 'Balcón'),
    orientacion:           val(lead, 'Orientación'),
    piso:                  val(lead, 'Piso'),
    superficie:            val(lead, 'Superficie'),
    unidad_superficie:     val(lead, 'Unidad superficie'),
    uso_suelo:             val(lead, 'Uso de suelo'),
    deuda_hipotecaria:     val(lead, 'Deuda hipotecaria'),
    moneda_hipotecaria:    val(lead, 'Moneda hipotecaria'),
    deuda_contribuciones:  val(lead, 'Deuda contribuciones'),
    moneda_contribuciones: val(lead, 'Moneda contribuciones'),
  };
}

function primerNombre(nombre) {
  return String(nombre || '').trim().split(/\s+/)[0] || '';
}
