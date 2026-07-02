import { json, readJson } from './_lib/http.js';
import { notionCreatePage, rt, hoyISO } from './_lib/notion.js';
import { waAlonsoYPablo } from './_lib/notify.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const data = await readJson(request);
  if (!data) return json({ ok: false }, 400);

  const tipoMap = {
    casa: 'Casa', departamento: 'Departamento', oficina: 'Oficina',
    local: 'Local comercial', terreno: 'Terreno', parcela: 'Parcela',
    bodega: 'Bodega / Estacionamiento',
  };

  const props = {};

  props['Nombre'] = { title: [{ text: { content: data.nombre || '' } }] };
  if (data.telefono)           props['Teléfono']             = { phone_number: data.telefono };
  if (data.email)              props['Email']                = { email: String(data.email).trim().toLowerCase() };
  if (data.tipo)               props['Tipo de propiedad']    = { select: { name: tipoMap[data.tipo] || data.tipo } };
  if (data.direccion)          props['Dirección']            = rt(data.direccion);
  if (data.comuna)             props['Comuna']               = rt(data.comuna);
  if (data.region)             props['Región']               = rt(data.region);
  if (data.m2)                 props['M²']                   = { number: Number(data.m2) };
  if (data.m2_construidos)     props['M² construidos']       = { number: Number(data.m2_construidos) };
  if (data.m2_utiles)          props['M² útiles']            = { number: Number(data.m2_utiles) };
  if (data.m2_totales)         props['M² totales']           = { number: Number(data.m2_totales) };
  if (data.m2_utiles && data.m2_totales)
                               props['M² ponderados']        = { number: Math.round((Number(data.m2_utiles) + Number(data.m2_totales)) / 2) };
  if (data.habitaciones)       props['Habitaciones']         = { number: Number(data.habitaciones) };
  if (data.banos)              props['Baños']                = { number: Number(data.banos) };
  if (data.balcon)             props['Balcón']               = { select: { name: data.balcon === 'si' ? 'Sí' : 'No' } };
  if (data.orientacion)        props['Orientación']          = rt(data.orientacion);
  if (data.piso)               props['Piso']                 = { number: Number(data.piso) };
  if (data.estacionamiento)    props['Estacionamiento']      = rt(data.estacionamiento);
  if (data.bodega)             props['Bodega']               = { select: { name: data.bodega === 'si' ? 'Sí' : 'No' } };
  if (data.superficie)         props['Superficie']           = { number: Number(data.superficie) };
  if (data.unidad_superficie)  props['Unidad superficie']    = { select: { name: data.unidad_superficie } };
  if (data.uso_suelo)          props['Uso de suelo']         = rt(data.uso_suelo);
  if (data.agua)               props['Agua']                 = rt(data.agua);
  if (data.electricidad)       props['Electricidad']         = rt(data.electricidad);
  if (data.acceso)             props['Acceso']               = rt(data.acceso);
  if (data.frente)             props['Frente (ml)']          = { number: Number(data.frente) };
  if (data.rol_sii)            props['Rol SII']              = rt(data.rol_sii);
  if (data.precio)             props['Pretensión de venta']  = { number: Number(data.precio) };
  if (data.moneda_precio)      props['Moneda precio']        = { select: { name: data.moneda_precio } };
  if (data.tiempo)             props['Tiempo publicada']     = rt(data.tiempo);
  if (data.monto_hipotecaria)  props['Deuda hipotecaria']    = { number: Number(data.monto_hipotecaria) };
  if (data.moneda_hipotecaria) props['Moneda hipotecaria']   = { select: { name: data.moneda_hipotecaria } };
  if (data.monto_contribuciones) props['Deuda contribuciones'] = { number: Number(data.monto_contribuciones) };
  if (data.moneda_contribuciones) props['Moneda contribuciones'] = { select: { name: data.moneda_contribuciones } };

  props['Asignado']      = { select: { name: 'Por Asignar' } };
  props['Estado']        = { select: { name: 'nuevo' } };
  props['Canal origen']  = { select: { name: 'Formulario web' } };
  props['Fecha envío']   = { date: { start: hoyISO() } };

  const creada = await notionCreatePage(env, env.NOTION_LEADS_DB_ID, props);
  if (!creada) return json({ ok: false }, 500);

  await waAlonsoYPablo(env, buildAlertMessage(data, tipoMap));

  return json({ ok: true });
}

function buildAlertMessage(data, tipoMap) {
  const tipo  = tipoMap[data.tipo] || data.tipo || '—';
  const lugar = [data.comuna, data.region].filter(Boolean).join(', ') || '—';
  const precio = data.precio
    ? `${Number(data.precio).toLocaleString('es-CL')} ${data.moneda_precio || ''}`
    : '—';

  return [
    '🏠 Nuevo lead — alonsolopez.cl',
    `Nombre:   ${data.nombre || '—'}`,
    `Telefono: ${data.telefono || '—'}`,
    `Email:    ${data.email || '—'}`,
    `Tipo:     ${tipo}`,
    `Lugar:    ${lugar}`,
    `Precio:   ${precio}`,
  ].join('\n');
}
