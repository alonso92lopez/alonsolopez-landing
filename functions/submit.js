export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const tipoMap = {
    casa: 'Casa', departamento: 'Departamento', oficina: 'Oficina',
    local: 'Local comercial', terreno: 'Terreno', parcela: 'Parcela',
    bodega: 'Bodega / Estacionamiento',
  };

  const props = {};

  props['Nombre'] = { title: [{ text: { content: data.nombre || '' } }] };
  if (data.telefono)           props['Teléfono']             = { phone_number: data.telefono };
  if (data.email)              props['Email']                = { email: data.email };
  if (data.tipo)               props['Tipo de propiedad']    = { select: { name: tipoMap[data.tipo] || data.tipo } };
  if (data.direccion)          props['Dirección']            = rt(data.direccion);
  if (data.comuna)             props['Comuna']               = rt(data.comuna);
  if (data.region)             props['Región']               = rt(data.region);
  if (data.m2)                 props['M²']                   = { number: Number(data.m2) };
  if (data.m2_construidos)     props['M² construidos']       = { number: Number(data.m2_construidos) };
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

  props['Estado']        = { select: { name: 'Nuevo' } };
  props['Canal origen']  = { select: { name: 'Formulario web' } };
  props['Fecha envío']   = { date: { start: new Date().toISOString().split('T')[0] } };

  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: env.NOTION_LEADS_DB_ID },
      properties: props,
    }),
  });

  if (!notionRes.ok) {
    console.error('Notion error:', await notionRes.text());
    return json({ ok: false }, 500);
  }

  return json({ ok: true });
}

function rt(text) {
  return { rich_text: [{ text: { content: String(text) } }] };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
