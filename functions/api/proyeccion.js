// POST /api/proyeccion
// Recibe la proyección de una casa de remate y la guarda en la base Proyecciones de Notion.
// Valida el token (CASA_TOKENS) y avisa a Alonso por WhatsApp.

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }

  const casa = resolverCasa(env, body.t || '');
  if (!casa) return json({ ok: false, error: 'token' }, 401);
  if (!body.propiedad_id) return json({ ok: false, error: 'propiedad' }, 400);

  const codigo = body.codigo || 'PROP';
  const props = {
    'Proyección':    { title: [{ text: { content: `${codigo} — ${casa}` } }] },
    'Propiedad':     { relation: [{ id: body.propiedad_id }] },
    'Casa de remate':{ select: { name: casa } },
    'Fecha':         { date: { start: new Date().toISOString().split('T')[0] } },
  };
  if (body.resultado)   props['Resultado'] = { select: { name: body.resultado } };
  num(props, 'Monto mínimo', body.monto_minimo);
  num(props, 'Monto proyectado', body.monto_proyectado);
  num(props, 'Costo adicional', body.costo_adicional);
  if (body.moneda)       props['Moneda'] = { select: { name: body.moneda } };
  if (body.moneda_costo) props['Moneda costo'] = { select: { name: body.moneda_costo } };
  if (body.condiciones)  props['Condiciones'] = { rich_text: [{ text: { content: String(body.condiciones) } }] };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(env),
    body: JSON.stringify({ parent: { database_id: env.NOTION_PROYECCIONES_DB_ID }, properties: props }),
  });
  if (!res.ok) {
    console.error('Notion error:', await res.text());
    return json({ ok: false }, 500);
  }

  const moneda = body.moneda || '';
  const lineas = [`📊 Nueva proyección — ${casa}`, `${codigo}`];
  if (body.resultado === 'No califica') {
    lineas.push('Resultado: NO CALIFICA');
    if (body.condiciones) lineas.push(`Motivo: ${body.condiciones}`);
  } else {
    lineas.push(`Mínimo:     ${fmt(body.monto_minimo)} ${moneda}`);
    lineas.push(`Proyectado: ${fmt(body.monto_proyectado)} ${moneda}`);
    if (body.costo_adicional && Number(body.costo_adicional) > 0) {
      lineas.push(`Costo adicional: ${fmt(body.costo_adicional)} ${body.moneda_costo || ''}`);
    }
  }
  await notifyWhatsApp(env.WA_ALONSO_PHONE, env.WA_ALONSO_KEY, lineas.join('\n'));

  return json({ ok: true });
}

// --- helpers ---

function resolverCasa(env, token) {
  if (!token) return null;
  try {
    const mapa = JSON.parse(env.CASA_TOKENS || '{}');
    return mapa[token] || null;
  } catch {
    return null;
  }
}

function num(props, name, value) {
  if (value === '' || value === null || value === undefined) return;
  const n = Number(value);
  if (!Number.isNaN(n)) props[name] = { number: n };
}

function fmt(v) {
  if (v === '' || v === null || v === undefined) return '—';
  return Number(v).toLocaleString('es-CL');
}

async function notifyWhatsApp(phone, apikey, text) {
  if (!phone || !apikey) return;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${apikey}`;
  try { await fetch(url); } catch { /* no bloquear por la alerta */ }
}

function notionHeaders(env) {
  return {
    'Authorization': `Bearer ${env.NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
