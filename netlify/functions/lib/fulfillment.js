const crypto = require('node:crypto');
const { stores } = require('./storage');
const { renderSvg, skyLesson, lessonHtml } = require('./sky');

async function fetchPayment(paymentId) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error('MERCADO_PAGO_ACCESS_TOKEN ausente');
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payment = await response.json();
  if (!response.ok) throw new Error(payment.message || 'Pagamento inválido');
  return payment;
}

function isOurApprovedPayment(payment) {
  return Boolean(payment && payment.status === 'approved' && payment.metadata && payment.metadata.product === 'minha-carta-celeste-digital');
}

async function loadJson(store, key) {
  const raw = await store.get(key);
  return raw ? JSON.parse(raw) : null;
}

function escapeEmail(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function sendEmail({ to, design, lesson, downloadUrl, reference }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn('E-mail não enviado: configure RESEND_API_KEY e EMAIL_FROM.');
    return { sent: false, reason: 'not_configured' };
  }

  const safeUrl = downloadUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: `Sua Carta Celeste está pronta ✦ ${design.title}`,
      html: `<div style="background:#f5f1e9;padding:32px 18px"><div style="max-width:640px;margin:auto;background:#fff;padding:34px;border-radius:4px"><p style="font:600 11px Arial;letter-spacing:.18em;color:#806f55">MINHA CARTA CELESTE</p><h1 style="font:400 38px Georgia,serif;color:#121827;margin:12px 0">O seu céu chegou.</h1><p style="font:15px Arial,sans-serif;color:#4d5564;line-height:1.7">Seu pagamento foi confirmado e a Carta Celeste de <strong>${escapeEmail(design.title)}</strong> está pronta para baixar.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#11182c;color:#fff;text-decoration:none;padding:15px 22px;font:600 13px Arial">BAIXAR ARTE EM ALTA</a></p><p style="font:12px Arial;color:#7a7f89">Pedido ${escapeEmail(reference)}</p><hr style="border:0;border-top:1px solid #e6e0d6;margin:34px 0">${lessonHtml(design, lesson)}</div></div>`,
      tags: [{ name: 'category', value: 'carta_entregue' }]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Falha ao enviar e-mail');
  return { sent: true, id: data.id || null };
}

async function ensureFulfilled(event, payment, baseUrl) {
  if (!isOurApprovedPayment(payment)) return { paid: false, status: payment?.status || 'unknown' };
  const orderRef = payment.external_reference;
  if (!orderRef) throw new Error('Pagamento sem referência do pedido');

  const { orders, artifacts, markers } = await stores(event);
  const order = await loadJson(orders, orderRef);
  if (!order || !order.design || !order.email) throw new Error('Pedido não encontrado no armazenamento');

  const token = crypto.createHmac('sha256', process.env.MERCADO_PAGO_ACCESS_TOKEN)
    .update(`${payment.id}:${orderRef}:mcc-download-v1`)
    .digest('base64url');
  const artifactKey = `final/${token}.svg`;
  const downloadUrl = `${baseUrl}/api/download?token=${encodeURIComponent(token)}`;

  let lesson = order.lesson;
  if (!order.fulfilled) {
    const [starsResponse, constellationsResponse] = await Promise.all([
      fetch(`${baseUrl}/data/stars.6.json`),
      fetch(`${baseUrl}/data/constellations.lines.json`)
    ]);
    if (!starsResponse.ok || !constellationsResponse.ok) throw new Error('Catálogo astronômico local indisponível');
    const [stars, constellations] = await Promise.all([starsResponse.json(), constellationsResponse.json()]);
    const svg = renderSvg(order.design, stars, constellations);
    lesson = skyLesson(order.design, constellations);
    await artifacts.set(artifactKey, svg);
    order.fulfilled = true;
    order.fulfilledAt = new Date().toISOString();
    order.paymentId = String(payment.id);
    order.paymentStatus = payment.status;
    order.artifactToken = token;
    order.lesson = lesson;
    await orders.set(orderRef, JSON.stringify(order));
  }

  if (!lesson) lesson = order.lesson || { poetry:'',sunText:'',moonText:'',planetsText:'',constText:'' };

  const markerKey = `email/${payment.id}`;
  try {
    const markerResult = await markers.set(markerKey, 'sending', { onlyIfNew: true });
    if (markerResult.modified) {
      try {
        const email = await sendEmail({ to: order.email, design: order.design, lesson, downloadUrl, reference: orderRef });
        await markers.set(markerKey, email.sent ? `sent:${email.id || ''}` : `pending:${email.reason || ''}`);
        order.emailStatus = email.sent ? 'sent' : 'pending_configuration';
        order.emailId = email.id || null;
        await orders.set(orderRef, JSON.stringify(order));
      } catch (emailError) {
        await markers.delete(markerKey);
        console.error('Falha no e-mail da Carta Celeste:', emailError);
      }
    }
  } catch (markerError) {
    console.error('Falha no controle de idempotência do e-mail:', markerError);
  }

  return { paid: true, status: payment.status, reference: orderRef, downloadUrl, email: order.email, lesson };
}

module.exports = { fetchPayment, isOurApprovedPayment, ensureFulfilled };
