// backend/routes/kb.js
const express = require('express');
const router = express.Router();
const knex = require('../db/knex');
const { embedText, cosine } = require('../ai/embedding');
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/** เพิ่ม/แก้/ลบ KB (แอดมินใช้) **/
router.get('/kb', async (_req, res) => {
  const items = await knex('kb_articles').select('*').orderBy('updated_at', 'desc');
  res.json(items);
});

router.post('/kb', async (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title & content required' });
  const [id] = await knex('kb_articles').insert({ title, content, category });
  // embed & save
  const vector = await embedText(`${title}\n${content}`);
  await knex('kb_embeddings').insert({ article_id: id, vector: JSON.stringify(vector) });
  res.status(201).json({ id });
});

router.put('/kb/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, category } = req.body;
  const cnt = await knex('kb_articles').where({ id }).update({ title, content, category });
  if (!cnt) return res.status(404).json({ error: 'not found' });
  const vector = await embedText(`${title}\n${content}`);
  await knex('kb_embeddings').where({ article_id: id }).del();
  await knex('kb_embeddings').insert({ article_id: id, vector: JSON.stringify(vector) });
  res.json({ ok: true });
});

router.delete('/kb/:id', async (req, res) => {
  const { id } = req.params;
  await knex('kb_embeddings').where({ article_id: id }).del();
  await knex('kb_articles').where({ id }).del();
  res.json({ ok: true });
});

/** ถามแชตบ็อต **/
router.post('/ai/ask', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  // 1) คำนวณ embedding ของคำถาม
  const qvec = await embedText(query);

  // 2) ดึง embedding ทั้งหมดมาเทียบ (production: ใส่ cache / vector index)
  const rows = await knex('kb_embeddings as e')
    .join('kb_articles as a', 'a.id', 'e.article_id')
    .select('a.id', 'a.title', 'a.content', 'a.category', 'e.vector');

  // 3) จัดอันดับด้วย cosine
  const ranked = rows.map(r => {
    const v = JSON.parse(r.vector);
    return { ...r, score: cosine(qvec, v) };
  }).sort((x, y) => y.score - x.score);

  const topK = ranked.slice(0, 4);
  const context = topK.map((r, i) =>
    `[#${i+1}] ${r.title} (${r.category})\n${r.content}`
  ).join('\n\n');

  // 4) ถ้ามีคีย์ LLM -> ให้สรุป/ตอบ โดยอ้างอิง context
  if (OPENAI_API_KEY) {
    const prompt = `
คุณเป็นแชตบ็อตศูนย์ความรู้ไอทีขององค์กร ตอบเป็นภาษาไทย กระชับ ชัดเจน
ใช้เฉพาะข้อมูลจาก "Context" ด้านล่างเท่านั้น ถ้าไม่พบข้อมูลให้บอกว่ายังไม่มีข้อมูล
ใส่ "หัวข้ออ้างอิง" เป็นรายการหมายเลข [#] ที่ใช้จริง

คำถาม: ${query}

Context:
${context}
    `.trim();

    try {
      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        },
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );
      const answer = resp.data.choices?.[0]?.message?.content || '…';
      return res.json({
        answer,
        sources: topK.map((r, i) => ({ id: r.id, title: r.title, index: i+1, score: Number(r.score.toFixed(3)) }))
      });
    } catch (e) {
      console.error('ai/ask openai error:', e?.response?.data || e.message);
    }
  }

  // 5) fallback: ตอบแบบ extractive จากบทความที่ใกล้ที่สุด
  const best = topK[0];
  const snippet = best ? `${best.title}\n\n${best.content.slice(0, 500)}…` : 'ยังไม่มีข้อมูลในฐานความรู้';
  res.json({
    answer: `จากฐานความรู้: \n\n${snippet}`,
    sources: topK.map((r, i) => ({ id: r.id, title: r.title, index: i+1, score: Number(r.score.toFixed(3)) }))
  });
});

module.exports = router;
