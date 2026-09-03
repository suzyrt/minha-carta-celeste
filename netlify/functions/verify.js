const { fetchPayment, ensureFulfilled } = require('./lib/fulfillment');

const json = (statusCode, body) => ({ statusCode, headers:{'content-type':'application/json','cache-control':'no-store'}, body:JSON.stringify(body) });

exports.handler = async function(event) {
  const q = event.queryStringParameters || {};
  const paymentId = q.payment_id || q.collection_id;
  if (!paymentId) return json(400, { paid:false, error:'Pagamento ausente.' });
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) return json(503, { paid:false, error:'Mercado Pago não configurado.' });

  try {
    const payment = await fetchPayment(paymentId);
    if (payment.status !== 'approved') return json(200, { paid:false, status:payment.status });
    const baseUrl = (process.env.SITE_URL || event.headers.origin || '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('SITE_URL ausente');
    const result = await ensureFulfilled(event, payment, baseUrl);
    return json(200, result);
  } catch (error) {
    console.error('Verify error:', error);
    return json(400, { paid:false, error:'Não foi possível confirmar e preparar sua Carta Celeste.' });
  }
};
