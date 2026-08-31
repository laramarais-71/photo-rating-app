const { getStore } = require('@netlify/blobs');

const ADMIN_PASSWORD = 'admin';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');
    if (password !== ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid password' }) };
    }

    const imagesStore = getStore('images');
    const votesStore = getStore('votes');
    const { blobs } = await imagesStore.list();

    const results = [];
    for (const b of blobs) {
      const img = await imagesStore.get(b.key, { type: 'json' });
      const votes = (await votesStore.get(b.key, { type: 'json' })) || [];
      const count = votes.length;
      const sum = votes.reduce((acc, v) => acc + v.score, 0);
      const avg = count ? sum / count : 0;

      results.push({
        id: img.id,
        filename: img.filename,
        uploadedAt: img.uploadedAt,
        voteCount: count,
        averageScore: Math.round(avg * 100) / 100,
        totalScore: sum,
        scores: votes.map((v) => v.score)
      });
    }

    return { statusCode: 200, body: JSON.stringify({ results }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
