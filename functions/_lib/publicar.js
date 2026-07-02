// Publicación de un lead validado como propiedad ANONIMIZADA en la base
// 'Propiedades en cotización'. Espejo de comercial/portal/publicar.py:
// copia solo características físicas + dirección + deudas — nunca contacto,
// rol SII ni pretensión de venta.

import { notionGetPage, notionUpdatePage, notionCreatePage, notionQuery, val, rt, hoyISO } from './notion.js';
import { cambiarEtapa } from './etapas.js';

// Campos a copiar del lead a la propiedad anonimizada (nombre -> tipo Notion).
// Mismos nombres en ambas bases. NO incluye nada identificable ni el precio.
const CAMPOS_COPIA = {
  'Tipo de propiedad':  'select',
  'Comuna':             'rich_text',
  'Región':             'rich_text',
  'M²':                 'number',
  'M² construidos':     'number',
  'M² útiles':          'number',
  'M² totales':         'number',
  'M² ponderados':      'number',
  'Habitaciones':       'number',
  'Baños':              'number',
  'Estacionamiento':    'rich_text',
  'Bodega':             'select',
  'Balcón':             'select',
  'Orientación':        'rich_text',
  'Piso':               'number',
  'Superficie':         'number',
  'Unidad superficie':  'select',
  'Uso de suelo':       'rich_text',
  'Dirección':          'rich_text',
  'Deuda hipotecaria':  'number',
  'Moneda hipotecaria': 'select',
  'Deuda contribuciones': 'number',
  'Moneda contribuciones': 'select',
};

// Sin estos campos la casa de remate no puede evaluar: no se publica.
// (un 0 cuenta como dato; solo vacío/None se considera faltante.)
export const REQUERIDOS = [
  'M² útiles', 'M² totales', 'Comuna', 'Región', 'Baños', 'Habitaciones',
  'Estacionamiento', 'Bodega', 'Deuda hipotecaria', 'Dirección',
];

const ESTADO_EN_COTIZACION = '2 - En cotizacion';

// Etapas desde las cuales ya no corresponde publicar de nuevo.
const ETAPAS_YA_PUBLICADA = [
  'En evaluación', 'Propuesta en preparación', 'Propuesta enviada',
  'Propuesta aceptada', 'Propuesta rechazada',
];

function vacio(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

export function camposFaltantes(page) {
  return REQUERIDOS.filter((c) => vacio(val(page, c)));
}

function toWrite(tipo, valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (tipo === 'rich_text') return rt(valor);
  if (tipo === 'number') return { number: valor };
  if (tipo === 'select') return { select: { name: String(valor) } };
  return null;
}

async function siguienteCodigo(env) {
  const paginas = await notionQuery(env, env.NOTION_PROPIEDADES_DB_ID);
  let maximo = 0;
  for (const p of paginas) {
    const cod = val(p, 'Código') || '';
    if (cod.startsWith('PROP-')) {
      const num = parseInt(cod.split('-')[1], 10);
      if (!Number.isNaN(num)) maximo = Math.max(maximo, num);
    }
  }
  return `PROP-${String(maximo + 1).padStart(3, '0')}`;
}

function tokenHex() {
  const bytes = new Uint8Array(12); // 24 hex, mismo formato que portal_lead.py
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Publica el lead: crea PROP-NNN Abierta, marca el lead '2 - En cotizacion'
// y mueve la etapa a 'En evaluación' (Historial + email al lead).
export async function publicarLead(env, leadId, { forzar = false, actor = 'Alonso' } = {}) {
  const lead = await notionGetPage(env, leadId);
  if (!lead) return { ok: false, status: 404, error: 'lead', mensaje: 'Lead no encontrado' };

  const etapaActual = val(lead, 'Etapa portal');
  if (ETAPAS_YA_PUBLICADA.includes(etapaActual)) {
    return { ok: false, status: 409, error: 'ya-publicada', mensaje: `El lead ya está en '${etapaActual}'` };
  }

  const faltan = camposFaltantes(lead);
  if (faltan.length && !forzar) {
    return { ok: false, status: 409, error: 'faltan', faltan, mensaje: `Faltan: ${faltan.join(', ')}` };
  }

  const codigo = await siguienteCodigo(env);
  const nuevos = {
    'Código': { title: [{ text: { content: codigo } }] },
    'Estado': { select: { name: 'Abierta' } },
    'Fecha publicación': { date: { start: hoyISO() } },
    'Lead origen': rt(leadId),
  };
  for (const [campo, tipo] of Object.entries(CAMPOS_COPIA)) {
    const payload = toWrite(tipo, val(lead, campo));
    if (payload !== null) nuevos[campo] = payload;
  }

  // M² ponderados: fuente única = se recalcula al publicar desde útiles+totales.
  const utiles = val(lead, 'M² útiles');
  const totales = val(lead, 'M² totales');
  if (!vacio(utiles) && !vacio(totales)) {
    // mitad hacia arriba, igual que Math.round del form (no banker's rounding)
    nuevos['M² ponderados'] = { number: Math.floor((utiles + totales) / 2 + 0.5) };
  }

  const creada = await notionCreatePage(env, env.NOTION_PROPIEDADES_DB_ID, nuevos);
  if (!creada) return { ok: false, status: 500, error: 'notion', mensaje: 'No se pudo crear la propiedad' };

  // Token del portal legacy del lead (lo garantizamos igual que publicar.py).
  let token = (val(lead, 'Token portal') || '').trim();
  if (!token) {
    token = tokenHex();
    await notionUpdatePage(env, leadId, { 'Token portal': rt(token) });
  }

  // Writeback en el lead: estado interno + nota de trazabilidad.
  const notas = (val(lead, 'Notas') || '').trim();
  const sufijo = `Portal: ${codigo} (${hoyISO()})`;
  await notionUpdatePage(env, leadId, {
    'Estado': { select: { name: ESTADO_EN_COTIZACION } },
    'Notas': rt(notas ? `${notas}\n${sufijo}` : sufijo),
  });

  // La etapa pública se mueve vía la máquina de estados (Historial + fecha +
  // email al lead). Si falla, la propiedad ya quedó publicada.
  const etapa = await cambiarEtapa(env, {
    leadId, etapa: 'En evaluación', actor, detalle: `Publicada como ${codigo}`,
  });

  return {
    ok: true,
    codigo,
    etapaOk: !!etapa.ok,
    linkEstado: `https://alonsolopez.cl/estado?t=${token}`,
  };
}
