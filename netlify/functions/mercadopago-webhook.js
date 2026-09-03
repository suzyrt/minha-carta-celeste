const crypto = require('node:crypto');
const { fetchPayment, ensureFulfilled } = require('./lib/fulfillment');

function validSignature(event, dataId) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = event.headers['x-signature'] || event.headers['X-Signature'];
  const requestId = event.headers['x-request-id'] || event.headers['X-Request-Id'];
  if (!signature || !requestId || !dataId) return false;

  const values = {};
  for (const part of signature.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key && value) values[key.trim()] = value.trim();
  }
  if (!values.ts || !values.v1) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${values.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(values.v1, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'method not allowed' };
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN || !process.env.MERCADO_PAGO_WEBHOOK_SECRET) return { statusCode:503, body:'Mercado Pago não configurado.' };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const q = event.queryStringParameters || {};
    const dataId = q['data.id'] || body?.data?.id;
    if (!validSignature(event, dataId)) return { statusCode:401, body:'invalid signature' };
    if (!dataId || (body.type && body.type !== 'payment')) return { statusCode:200, body:'ok' };

    const payment = await fetchPayment(dataId);
    if (payment.status === 'approved') {
      const baseUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
      if (!baseUrl) throw new Error('SITE_URL ausente');
      await ensureFulfilled(event, payment, baseUrl);
    }
    return { statusCode:200, body:'ok' };
  } catch (error) {
    console.error('Mercado Pago webhook error:', error);
    return { statusCode:500, body:'retry' };
  }
};
