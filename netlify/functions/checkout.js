const Stripe = require('stripe');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({error:'Método não permitido.'}) };
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 503, headers:{'content-type':'application/json'}, body: JSON.stringify({error:'O pagamento ainda não foi configurado no Netlify.'}) };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = JSON.parse(event.body || '{}');
    const price = Number(process.env.PRODUCT_PRICE_CENTS || 4990);
    const baseUrl = (process.env.SITE_URL || event.headers.origin || '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('SITE_URL ausente');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: price,
          product_data: {
            name: 'Minha Carta Celeste — arquivo digital em alta resolução',
            description: `Mapa celeste personalizado ${body.size || ''}`.trim()
          }
        }
      }],
      metadata: {
        product: 'minha-carta-celeste-digital',
        title: String(body.title || '').slice(0, 200),
        size: String(body.size || 'A4').slice(0, 50)
      },
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancelled`
    });

    return { statusCode: 200, headers:{'content-type':'application/json'}, body: JSON.stringify({url: session.url}) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers:{'content-type':'application/json'}, body: JSON.stringify({error:'Não foi possível abrir o pagamento agora.'}) };
  }
};
