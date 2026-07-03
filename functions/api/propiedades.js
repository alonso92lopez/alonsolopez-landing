// GET /api/propiedades?t=TOKEN
// Devuelve las propiedades Abiertas (anonimizadas) para que la casa de remate cotice.
// Valida el token contra CASA_TOKENS y nunca expone el campo interno "Lead origen".

import { json } from '../_lib/http.js';
import { notionQuery, notionGetPage, val } from '../_lib/notion.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const token = new URL(request.url).searchParams.get('t') || '';
  const casa = resolverCasa(env, token);
  if (!casa) return json({ ok: false, error: 'token' }, 401);

  const propiedades = await listarPropiedadesParaCasa(env, casa);
  return json({ ok: true, casa, propiedades });
}

// Lista las propiedades Abiertas anonimizadas, marcando las que esta casa ya cotizó.
// Compartido con el portal autenticado de casas (misma vista, otra auth).
export async function listarPropiedadesParaCasa(env, casa) {
  const abiertas = await notionQuery(env, env.NOTION_PROPIEDADES_DB_ID, {
    property: 'Estado', select: { equals: 'Abierta' },
  });

  const proys = await notionQuery(env, env.NOTION_PROYECCIONES_DB_ID, {
    property: 'Casa de remate', select: { equals: casa },
  });
  const cotizadas = new Set();
  for (const p of proys) {
    for (const r of (p.properties['Propiedad']?.relation || [])) cotizadas.add(r.id);
  }

  // Las fotos viven en el lead de origen (fuente única, así aparecen aunque se
  // suban DESPUÉS de publicar). El servidor las desreferencia vía 'Lead origen';
  // la casa nunca ve al lead, solo recibe las URLs de las fotos.
  return Promise.all(abiertas.map(async (p) => {
    const leadId = val(p, 'Lead origen');
    let fotos = [];
    if (leadId) {
      const lead = await notionGetPage(env, leadId);
      if (lead) fotos = val(lead, 'Fotos') || [];
    }
    return {
      id: p.id,
      codigo:               val(p, 'Código'),
      tipo:                 val(p, 'Tipo de propiedad'),
      comuna:               val(p, 'Comuna'),
      region:               val(p, 'Región'),
      direccion:            val(p, 'Dirección'),
      m2:                   val(p, 'M²'),
      m2_construidos:       val(p, 'M² construidos'),
      m2_utiles:            val(p, 'M² útiles'),
      m2_totales:           val(p, 'M² totales'),
      m2_ponderados:        val(p, 'M² ponderados'),
      habitaciones:         val(p, 'Habitaciones'),
      banos:                val(p, 'Baños'),
      estacionamiento:      val(p, 'Estacionamiento'),
      bodega:               val(p, 'Bodega'),
      piso:                 val(p, 'Piso'),
      orientacion:          val(p, 'Orientación'),
      superficie:           val(p, 'Superficie'),
      unidad_superficie:    val(p, 'Unidad superficie'),
      uso_suelo:            val(p, 'Uso de suelo'),
      deuda_hipotecaria:    val(p, 'Deuda hipotecaria'),
      moneda_hipotecaria:   val(p, 'Moneda hipotecaria'),
      deuda_contribuciones: val(p, 'Deuda contribuciones'),
      moneda_contribuciones:val(p, 'Moneda contribuciones'),
      fecha_publicacion:    val(p, 'Fecha publicación'),
      fotos,
      yaCotizada:           cotizadas.has(p.id),
    };
  }));
}

export function resolverCasa(env, token) {
  if (!token) return null;
  try {
    const mapa = JSON.parse(env.CASA_TOKENS || '{}');
    return mapa[token] || null;
  } catch {
    return null;
  }
}
