// Cliente mínimo de la API de Notion para Pages Functions.
// Reemplaza los helpers que estaban duplicados en cada function.

export function notionHeaders(env) {
  return {
    'Authorization': `Bearer ${env.NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

// Query paginado. `filter` es opcional; `sorts` también.
export async function notionQuery(env, dbId, filter, sorts) {
  const resultados = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
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

export async function notionCreatePage(env, dbId, properties) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(env),
    body: JSON.stringify({ parent: { database_id: dbId }, properties }),
  });
  if (!res.ok) {
    console.error('Notion create error:', await res.text());
    return null;
  }
  return res.json();
}

export async function notionUpdatePage(env, pageId, properties) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(env),
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) {
    console.error('Notion update error:', await res.text());
    return null;
  }
  return res.json();
}

export async function notionGetPage(env, pageId) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: notionHeaders(env),
  });
  if (!res.ok) {
    console.error('Notion get error:', await res.text());
    return null;
  }
  return res.json();
}

// Extrae el valor plano de una propiedad de una página según su tipo.
export function val(page, name) {
  const p = page.properties[name];
  if (!p) return null;
  switch (p.type) {
    case 'title':        return p.title.map((x) => x.plain_text).join('');
    case 'rich_text':    return p.rich_text.map((x) => x.plain_text).join('');
    case 'number':       return p.number;
    case 'select':       return p.select ? p.select.name : null;
    case 'date':         return p.date ? p.date.start : null;
    case 'email':        return p.email;
    case 'phone_number': return p.phone_number;
    case 'relation':     return p.relation.map((r) => r.id);
    default:             return null;
  }
}

// --- builders de propiedades ---

export function rt(text) {
  return { rich_text: [{ text: { content: String(text) } }] };
}

// Setea un number solo si el valor es numérico (un 0 sí cuenta como dato).
export function num(props, name, value) {
  if (value === '' || value === null || value === undefined) return;
  const n = Number(value);
  if (!Number.isNaN(n)) props[name] = { number: n };
}

export function hoyISO() {
  return new Date().toISOString().split('T')[0];
}
