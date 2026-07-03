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
    case 'files':        return p.files.map((f) =>
                           f.type === 'external' ? f.external.url : (f.file ? f.file.url : null)
                         ).filter(Boolean);
    default:             return null;
  }
}

// Devuelve los objetos crudos de una propiedad `files` (para re-anexar sin perder
// los existentes: al escribir, Notion reemplaza toda la lista).
export function rawFiles(page, name) {
  const p = page.properties[name];
  return p && p.type === 'files' ? (p.files || []) : [];
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

// --- subida de archivos (File Upload API de Notion) ---

// Sube un archivo a Notion en dos pasos (crear file_upload + enviar bytes) y
// devuelve el id del file_upload, listo para adjuntarlo a una propiedad `files`.
// Devuelve null si algo falla (el llamador decide cómo reportarlo).
export async function notionUpload(env, filename, bytes, contentType) {
  const crear = await fetch('https://api.notion.com/v1/file_uploads', {
    method: 'POST',
    headers: notionHeaders(env),
    body: JSON.stringify({}),
  });
  if (!crear.ok) {
    console.error('Notion file_upload create error:', await crear.text());
    return null;
  }
  const { id, upload_url } = await crear.json();

  const form = new FormData();
  form.append('file', new Blob([bytes], { type: contentType || 'application/octet-stream' }), filename);
  const enviar = await fetch(upload_url, {
    method: 'POST',
    // OJO: multipart — no fijar Content-Type, el boundary lo pone fetch solo.
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
    },
    body: form,
  });
  if (!enviar.ok) {
    console.error('Notion file_upload send error:', await enviar.text());
    return null;
  }
  return id;
}

// Construye el valor de una propiedad `files` que CONSERVA las fotos previas y
// agrega las nuevas. `existentes` son objetos crudos (de rawFiles); `nuevas` son
// { id, name } de notionUpload.
export function filesAppendProp(existentes, nuevas) {
  const agregadas = (nuevas || []).map((u) => ({
    type: 'file_upload', file_upload: { id: u.id }, name: u.name,
  }));
  return { files: [...(existentes || []), ...agregadas] };
}
