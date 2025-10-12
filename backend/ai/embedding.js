// backend/ai/embedding.js
const crypto = require('crypto');
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

function bowEmbedding(text, dim = 384) {
  // ฝั่ง fallback: แฮชคำเป็น bucket (ไม่แม่นแต่พอค้นหาคร่าว ๆ)
  const vec = new Array(dim).fill(0);
  (text || '').toLowerCase().split(/\W+/).forEach((tok) => {
    if (!tok) return;
    const h = crypto.createHash('md5').update(tok).digest();
    const idx = h[0] % dim;
    vec[idx] += 1;
  });
  // normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v*v, 0)) || 1;
  return vec.map(v => v / norm);
}

async function embedText(text) {
  if (!OPENAI_API_KEY) return bowEmbedding(text);

  // ใช้ OpenAI embeddings (ถ้ามีคีย์)
  const resp = await axios.post(
    'https://api.openai.com/v1/embeddings',
    { input: text, model: 'text-embedding-3-small' },
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
  );
  return resp.data.data[0].embedding;
}

function cosine(a, b) {
  let s = 0, sa = 0, sb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    s += a[i] * b[i];
    sa += a[i] * a[i];
    sb += b[i] * b[i];
  }
  return s / (Math.sqrt(sa) * Math.sqrt(sb) || 1);
}

module.exports = { embedText, cosine };
