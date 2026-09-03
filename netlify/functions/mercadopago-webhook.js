exports.handler = async function(event) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return { statusCode: 503, body: 'Mercado Pago não configurado.' };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const paymentId = body && body.data && body.data.id ? body.data.id : (event.queryStringParameters && event.queryStringParameters['data.id']);

    if (!paymentId) return { statusCode: 200, body: 'ok' };

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const payment = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago webhook payment fetch error:', payment);
      return { statusCode: 200, body: 'ok' };
    }

    if (payment.status === 'approved' && payment.metadata && payment.metadata.product === 'minha-carta-celeste-digital') {
      console.log('Pagamento aprovado:', {
        payment_id: payment.id,
        reference: payment.external_reference,
        email: payment.payer && payment.payer.email,
        size: payment.metadata.size,
        title: payment.metadata.title
      });
      // Próximo passo: gerar/armazenar a arte final e enviar o e-mail transacional.
    }

    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    console.error('Mercado Pago webhook error:', error);
    return { statusCode: 200, body: 'ok' };
  }
};
