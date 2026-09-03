exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido.' }) };
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'O Mercado Pago ainda não foi configurado no Netlify.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const email = String(body.email || '').trim();
    const title = String(body.title || '').trim();
    const size = String(body.size || 'A4').trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Informe um e-mail válido para receber sua Carta Celeste.' })
      };
    }

    const allowedSizes = new Set(['A4', 'A3', '60']);
    if (!allowedSizes.has(size)) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Formato inválido.' })
      };
    }

    const prices = {
      A4: Number(process.env.PRICE_A4_CENTS || 4990) / 100,
      A3: Number(process.env.PRICE_A3_CENTS || 5990) / 100,
      '60': Number(process.env.PRICE_60_CENTS || 6990) / 100
    };

    const baseUrl = (process.env.SITE_URL || event.headers.origin || '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('SITE_URL ausente');

    const orderRef = `MCC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const preferenceBody = {
      items: [
        {
          id: `carta-celeste-${size.toLowerCase()}`,
          title: 'Minha Carta Celeste — arquivo digital em alta resolução',
          description: `Mapa celeste personalizado — formato ${size === '60' ? '42,4 × 60 cm' : size}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: prices[size]
        }
      ],
      payer: { email },
      external_reference: orderRef,
      metadata: {
        product: 'minha-carta-celeste-digital',
        title: title.slice(0, 200),
        size,
        buyer_email: email
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
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': orderRef
      },
      body: JSON.stringify(preferenceBody)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Mercado Pago preference error:', data);
      throw new Error(data.message || 'Falha ao criar preferência');
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: data.init_point,
        preference_id: data.id,
        order_reference: orderRef
      })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Não foi possível abrir o pagamento agora.' })
    };
  }
};
