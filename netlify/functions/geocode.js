exports.handler = async function(event) {
  const q = (event.queryStringParameters && event.queryStringParameters.q || '').trim();
  if (!q || q.length < 2) {
    return { statusCode: 400, headers: {'content-type':'application/json'}, body: JSON.stringify({error:'Digite uma cidade ou local.'}) };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MinhaCartaCeleste/1.0 (Netlify site)',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.6'
      }
    });
    if (!response.ok) throw new Error('Geocoding failed');
    const raw = await response.json();
    const result = raw.map(item => ({
      label: item.display_name,
      lat: Number(item.lat),
      lon: Number(item.lon),
      type: item.type
    }));
    return {
      statusCode: 200,
      headers: {'content-type':'application/json','cache-control':'public, max-age=3600'},
      body: JSON.stringify(result)
    };
  } catch (error) {
    return { statusCode: 502, headers: {'content-type':'application/json'}, body: JSON.stringify({error:'A busca de localização está temporariamente indisponível.'}) };
  }
};
