const Stripe = require('stripe');

exports.handler = async function(event) {
  const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
  if (!sessionId) {
    return { statusCode: 400, headers:{'content-type':'application/json'}, body: JSON.stringify({paid:false,error:'Sessão ausente.'}) };
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 503, headers:{'content-type':'application/json'}, body: JSON.stringify({paid:false,error:'Pagamento não configurado.'}) };
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' && session.metadata && session.metadata.product === 'minha-carta-celeste-digital';
    return { statusCode: 200, headers:{'content-type':'application/json','cache-control':'no-store'}, body: JSON.stringify({paid}) };
  } catch (error) {
    return { statusCode: 400, headers:{'content-type':'application/json'}, body: JSON.stringify({paid:false,error:'Sessão inválida.'}) };
  }
};
