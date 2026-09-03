const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  connectLambda(event);

  try {
    const store = getStore('images');
    const { blobs } = await store.list();

    const images = await Promise.all(
      blobs.map((b) => store.get(b.key, { type: 'json' }))
    );

    images.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));

    return {
      statusCode: 200,
      body: JSON.stringify({ images })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
