// Notificaciones: WhatsApp (callmebot) y email (Resend).

async function notifyWhatsApp(phone, apikey, text) {
  if (!phone || !apikey) return;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${apikey}`;
  try { await fetch(url); } catch { /* no bloquear por la alerta */ }
}

export async function waAlonso(env, text) {
  await notifyWhatsApp(env.WA_ALONSO_PHONE, env.WA_ALONSO_KEY, text);
}

export async function waAlonsoYPablo(env, text) {
  await Promise.allSettled([
    notifyWhatsApp(env.WA_ALONSO_PHONE, env.WA_ALONSO_KEY, text),
    notifyWhatsApp(env.WA_PABLO_PHONE, env.WA_PABLO_KEY, text),
  ]);
}

// Envío de email transaccional vía Resend (SMTP no está disponible en Workers).
// Requiere RESEND_API_KEY y el dominio alonsolopez.cl verificado en Resend.
export async function sendEmail(env, { to, subject, html, text }) {
  if (!env.RESEND_API_KEY) {
    console.error('sendEmail: falta RESEND_API_KEY');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'Alonso López <contacto@alonsolopez.cl>',
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    console.error('Resend error:', await res.text());
    return false;
  }
  return true;
}
