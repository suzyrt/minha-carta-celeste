const { stores } = require('./lib/storage');

exports.handler = async function(event) {
  const token = String((event.queryStringParameters || {}).token || '');
  if (!/^[A-Za-z0-9_-]{32,100}$/.test(token)) return { statusCode:400, body:'Link inválido.' };
  try {
    const { artifacts } = await stores(event);
    const svg = await artifacts.get(`final/${token}.svg`);
    if (!svg) return { statusCode:404, body:'Arquivo não encontrado.' };
    return {
      statusCode:200,
      headers:{
        'content-type':'image/svg+xml; charset=utf-8',
        'content-disposition':'attachment; filename="minha-carta-celeste-alta.svg"',
        'cache-control':'private, no-store',
        'x-content-type-options':'nosniff'
      },
      body:svg
    };
  } catch (error) {
    console.error('Download error:', error);
    return { statusCode:500, body:'Não foi possível abrir o arquivo.' };
  }
};
