const crypto = require('node:crypto');
const { stores } = require('./lib/storage');
const { normalizeDesign } = require('./lib/sky');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body)
});

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' });
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) return json(503, { error: 'O Mercado Pago ainda não foi configurado no Netlify.' });

  try {
    const body = JSON.parse(event.body || '{}');
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'Informe um e-mail válido para receber sua Carta Celeste.' });

    const design = normalizeDesign(body.design || body);
    const prices = {
      A4: Number(process.env.PRICE_A4_CENTS || 4990) / 100,
      A3: Number(process.env.PRICE_A3_CENTS || 5990) / 100,
      '60': Number(process.env.PRICE_60_CENTS || 6990) / 100
    };

    const baseUrl = (process.env.SITE_URL || event.headers.origin || '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('SITE_URL ausente');

    const orderRef = `MCC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const { orders } = await stores(event);
    await orders.set(orderRef, JSON.stringify({
      reference: orderRef,
      email,
      design,
      price: prices[design.size],
      currency: 'BRL',
      status: 'awaiting_payment',
      createdAt: new Date().toISOString()
    }));

    const preference = {
      items: [{
        id: `carta-celeste-${design.size.toLowerCase()}`,
        title: 'Minha Carta Celeste — arquivo digital em alta resolução',
        description: `Mapa celeste personalizado — ${design.size === '60' ? '42,4 × 60 cm' : design.size}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: prices[design.size]
      }],
      payer: { email },
      external_reference: orderRef,
      metadata: {
        product: 'minha-carta-celeste-digital',
        order_reference: orderRef,
        size: design.size
      },
      back_urls: {
        success: `${baseUrl}/?payment=success`,
        pending: `${baseUrl}/?payment=pending`,
        failure: `${baseUrl}/?payment=failure`
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/.netlify/functions/mercadopago-webhook`
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Mercado Pago preference error:', data);
      throw new Error(data.message || 'Falha ao criar preferência');
    }

    return json(200, { url: data.init_point, preference_id: data.id, order_reference: orderRef });
  } catch (error) {
    console.error('Checkout error:', error);
    return json(500, { error: 'Não foi possível abrir o pagamento agora.' });
  }
};
