const { getStore, connectLambda } = require('@netlify/blobs');

const ADMIN_PASSWORD = 'admin';

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password, id } = JSON.parse(event.body || '{}');

    if (password !== ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid password' }) };
    }
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) };
    }

    const imagesStore = getStore('images');
    const votesStore = getStore('votes');

    await imagesStore.delete(id);
    await votesStore.delete(id);

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
