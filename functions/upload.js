const { getStore } = require('@netlify/blobs');

const ADMIN_PASSWORD = 'admin';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password, filename, dataUrl } = JSON.parse(event.body || '{}');

    if (password !== ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid password' }) };
    }
    if (!filename || !dataUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing filename or dataUrl' }) };
    }

    const store = getStore('images');
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const record = {
      id,
      filename,
      dataUrl,
      uploadedAt: new Date().toISOString()
    };

    await store.setJSON(id, record);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
