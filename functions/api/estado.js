// GET /api/estado?t=TOKEN
// Portal de estado del propietario: devuelve SOLO en qué etapa va su proceso.
// Busca el lead por su 'Token portal' en la base de Leads y expone una whitelist
// estricta: nunca montos, proyecciones, casas de remate, deudas ni pretensión.

export async function onRequestGet(context) {
  const { request, env } = context;
  const token = (new URL(request.url).searchParams.get('t') || '').trim();
  // Sin token no se consulta: evita que un filtro equals:'' matchee leads sin link.
  if (!token) return json({ ok: false, error: 'token' }, 401);

  const leads = await notionQuery(env, env.NOTION_LEADS_DB_ID, {
    property: 'Token portal', rich_text: { equals: token },
  });
  if (!leads.length) return json({ ok: false, error: 'token' }, 401);

  const lead = leads[0];

  // Whitelist: lo único que el propietario puede ver de su propio lead.
  const nombreCompleto = val(lead, 'Nombre') || '';
  const data = {
    nombre:      primerNombre(nombreCompleto),
    tipo:        val(lead, 'Tipo de propiedad'),
    comuna:      val(lead, 'Comuna'),
    region:      val(lead, 'Región'),
    direccion:   val(lead, 'Dirección'),
    etapa:       val(lead, 'Etapa portal'),     // puede ser null -> el front asume la 1ª
    mensaje:     val(lead, 'Mensaje portal'),
    actualizado: lead.last_edited_time || null,
  };

  return json({ ok: true, ...data });
}

// --- helpers (duplicados a propósito por simplicidad de Pages Functions) ---

function primerNombre(nombre) {
  return String(nombre || '').trim().split(/\s+/)[0] || '';
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
