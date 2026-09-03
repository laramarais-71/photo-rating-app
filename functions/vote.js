const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { imageId, score } = JSON.parse(event.body || '{}');
    const s = Number(score);

    if (!imageId || !Number.isInteger(s) || s < 1 || s > 10) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid vote' }) };
    }

    const votesStore = getStore('votes');
    const existing = (await votesStore.get(imageId, { type: 'json' })) || [];
    existing.push({ score: s, votedAt: new Date().toISOString() });
    await votesStore.setJSON(imageId, existing);

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
