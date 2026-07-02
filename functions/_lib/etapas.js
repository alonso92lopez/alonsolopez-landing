// Etapas canónicas del proceso (campo 'Etapa portal' en la base Leads).
// Fuente de verdad del lado JS. Debe coincidir con comercial/portal/etapas.py
// y con el stepper de landing/portal/ y landing/estado/.

export const ETAPAS_PROCESO = [
  'Recibida',                  // el lead subió su propiedad
  'Validación',                // esperando la llamada de validación (gate 1)
  'En evaluación',             // publicada a las casas de remate
  'Propuesta en preparación',  // llegó proyección; Alonso arma la propuesta (gate 2)
  'Propuesta enviada',         // el lead puede aceptar o rechazar
];

export const ETAPAS_TERMINALES = [
  'Propuesta aceptada',
  'Propuesta rechazada',
  'No continúa',
];

export const ETAPAS_TODAS = [...ETAPAS_PROCESO, ...ETAPAS_TERMINALES];

import { notionGetPage, notionUpdatePage, notionCreatePage, val, rt, hoyISO } from './notion.js';
import { sendEmail } from './notify.js';

// ÚNICO punto por donde pasa todo cambio de 'Etapa portal' (CLI y web):
// valida la transición, escribe la etapa + la fecha en 'Fechas etapas',
// deja una fila de auditoría en Historial y avisa al lead por email si aplica.
//
// Nadie más debe escribir 'Etapa portal' directo en Notion.
export async function cambiarEtapa(env, { leadId, etapa, actor = 'Alonso', detalle = '', notificarEmail = true }) {
  if (!ETAPAS_TODAS.includes(etapa)) {
    return { ok: false, status: 400, error: 'etapa', mensaje: `Etapa desconocida: ${etapa}` };
  }

  const lead = await notionGetPage(env, leadId);
  if (!lead) return { ok: false, status: 404, error: 'lead', mensaje: 'Lead no encontrado' };

  const etapaActual = val(lead, 'Etapa portal') || 'Recibida';
  if (etapa === etapaActual) {
    return { ok: true, noop: true, etapaAnterior: etapaActual };
  }
  // Aceptar/rechazar solo tiene sentido con una propuesta enviada sobre la mesa.
  if ((etapa === 'Propuesta aceptada' || etapa === 'Propuesta rechazada')
      && etapaActual !== 'Propuesta enviada') {
    return {
      ok: false, status: 409, error: 'transicion',
      mensaje: `No se puede pasar de '${etapaActual}' a '${etapa}' (requiere 'Propuesta enviada')`,
    };
  }

  // Fecha de la transición (merge en el JSON de fechas del lead).
  let fechas = {};
  try { fechas = JSON.parse(val(lead, 'Fechas etapas') || '{}') || {}; } catch { fechas = {}; }
  fechas[etapa] = hoyISO();

  const escrito = await notionUpdatePage(env, leadId, {
    'Etapa portal': { select: { name: etapa } },
    'Fechas etapas': rt(JSON.stringify(fechas)),
  });
  if (!escrito) return { ok: false, status: 500, error: 'notion', mensaje: 'No se pudo escribir la etapa' };

  // Auditoría: una fila por transición, con fecha y hora.
  const nombre = val(lead, 'Nombre') || '(sin nombre)';
  if (env.NOTION_HISTORIAL_DB_ID) {
    await notionCreatePage(env, env.NOTION_HISTORIAL_DB_ID, {
      'Evento':  { title: [{ text: { content: `${nombre} → ${etapa}` } }] },
      'Lead':    { relation: [{ id: leadId }] },
      'Etapa':   { select: { name: etapa } },
      'Fecha':   { date: { start: new Date().toISOString() } },
      'Actor':   { select: { name: actor } },
      ...(detalle ? { 'Detalle': rt(detalle) } : {}),
    });
  }

  // Aviso por email al lead en las etapas que le importan.
  const email = val(lead, 'Email');
  if (notificarEmail && email && EMAIL_POR_ETAPA[etapa]) {
    const { asunto, cuerpo } = EMAIL_POR_ETAPA[etapa];
    await sendEmail(env, {
      to: email,
      subject: asunto,
      text: `Hola,\n\n${cuerpo}\n\nSigue el detalle en tu portal: https://alonsolopez.cl/portal/\n\nAlonso López · alonsolopez.cl`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
          <p style="font-size:15px">Hola,</p>
          <p style="font-size:15px">${cuerpo}</p>
          <p style="margin:28px 0">
            <a href="https://alonsolopez.cl/portal/" style="background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-size:15px;display:inline-block">Ver en mi portal</a>
          </p>
          <p style="font-size:13px;color:#666">Alonso López · Asesor en alternativas de salida inmobiliaria · <a href="https://alonsolopez.cl" style="color:#666">alonsolopez.cl</a></p>
        </div>`,
    });
  }

  return { ok: true, etapaAnterior: etapaActual };
}

const EMAIL_POR_ETAPA = {
  'En evaluación': {
    asunto: 'Tu propiedad ya está en evaluación',
    cuerpo: 'Validamos los datos de tu propiedad y ya está siendo evaluada por nuestra red de casas de remate. Te avisaremos apenas tengamos novedades.',
  },
  'Propuesta enviada': {
    asunto: 'Tu propuesta está lista 📋',
    cuerpo: 'Preparamos la propuesta comercial para tu propiedad. Entra a tu portal para revisarla y aceptarla o rechazarla.',
  },
  'Propuesta aceptada': {
    asunto: 'Recibimos tu aceptación ✅',
    cuerpo: 'Registramos que aceptaste la propuesta. Nos pondremos en contacto contigo muy pronto para coordinar los siguientes pasos.',
  },
  'Propuesta rechazada': {
    asunto: 'Registramos tu respuesta',
    cuerpo: 'Registramos que rechazaste la propuesta. Si quieres conversar otras alternativas para tu propiedad, respóndenos este correo.',
  },
};
