exports.handler = async function(event) {
  const paymentId = event.queryStringParameters && event.queryStringParameters.payment_id;
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!paymentId) {
    return { statusCode: 400, headers:{'content-type':'application/json'}, body: JSON.stringify({paid:false,error:'Pagamento ausente.'}) };
  }
  if (!accessToken) {
    return { statusCode: 503, headers:{'content-type':'application/json'}, body: JSON.stringify({paid:false,error:'Mercado Pago não configurado.'}) };
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const payment = await response.json();
    if (!response.ok) throw new Error(payment.message || 'Pagamento inválido');

    const paid = payment.status === 'approved' && payment.metadata && payment.metadata.product === 'minha-carta-celeste-digital';
    return {
      statusCode: 200,
      headers:{'content-type':'application/json','cache-control':'no-store'},
      body: JSON.stringify({
        paid,
        status: payment.status,
        email: payment.payer && payment.payer.email ? payment.payer.email : null,
        reference: payment.external_reference || null
      })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 400, headers:{'content-type':'application/json'}, body: JSON.stringify({paid:false,error:'Não foi possível confirmar o pagamento.'}) };
  }
};
