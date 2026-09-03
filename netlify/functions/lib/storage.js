async function stores(event) {
  const { connectLambda, getStore } = await import('@netlify/blobs');
  connectLambda(event);
  return {
    orders: getStore('mcc-orders'),
    artifacts: getStore('mcc-artifacts'),
    markers: getStore('mcc-markers')
  };
}

module.exports = { stores };
