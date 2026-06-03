// GET /api/propiedades?t=TOKEN
// Devuelve las propiedades Abiertas (anonimizadas) para que la casa de remate cotice.
// Valida el token contra CASA_TOKENS y nunca expone el campo interno "Lead origen".

export async function onRequestGet(context) {
  const { request, env } = context;
  const token = new URL(request.url).searchParams.get('t') || '';
  const casa = resolverCasa(env, token);
  if (!casa) return json({ ok: false, error: 'token' }, 401);

  const abiertas = await notionQuery(env, env.NOTION_PROPIEDADES_DB_ID, {
    property: 'Estado', select: { equals: 'Abierta' },
  });

  // Propiedades que esta casa ya cotizó (para marcarlas en la UI)
  const proys = await notionQuery(env, env.NOTION_PROYECCIONES_DB_ID, {
    property: 'Casa de remate', select: { equals: casa },
  });
  const cotizadas = new Set();
  for (const p of proys) {
    for (const r of (p.properties['Propiedad']?.relation || [])) cotizadas.add(r.id);
  }

  const propiedades = abiertas.map((p) => ({
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
    yaCotizada:           cotizadas.has(p.id),
  }));

  return json({ ok: true, casa, propiedades });
}

// --- helpers (duplicados a propósito por simplicidad de Pages Functions) ---

function resolverCasa(env, token) {
  if (!token) return null;
  try {
    const mapa = JSON.parse(env.CASA_TOKENS || '{}');
    return mapa[token] || null;
  } catch {
    return null;
  }
}

async function notionQuery(env, dbId, filter) {
  const resultados = [];
  let cursor;
  do {
    const body = { page_size: 100, filter };
    if (cursor) body.start_cursor = cursor;
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(env),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('Notion query error:', await res.text());
      break;
    }
    const data = await res.json();
    resultados.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return resultados;
}

function notionHeaders(env) {
  return {
    'Authorization': `Bearer ${env.NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

function val(page, name) {
  const p = page.properties[name];
  if (!p) return null;
  switch (p.type) {
    case 'title':      return p.title.map((x) => x.plain_text).join('');
    case 'rich_text':  return p.rich_text.map((x) => x.plain_text).join('');
    case 'number':     return p.number;
    case 'select':     return p.select ? p.select.name : null;
    case 'date':       return p.date ? p.date.start : null;
    default:           return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
