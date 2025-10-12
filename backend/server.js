// =================================================================
// 📁 backend/server.js
// อัปเดต:
// - เพิ่มคอลัมน์ users.accepting_jobs อัตโนมัติ (1=เปิดรับงาน, 0=ปิดรับ)
// - /api/me (GET/PUT) คืน accepting_jobs ด้วย
// - PUT /api/me/availability เปิด/ปิดรับงานของช่าง
// - อีเมล optional ผ่าน .env (ไม่ตั้งค่าจะข้ามส่ง)
// - /api/tickets robust + debug log, CORS ระบุ origin + credentials
// - ✅ ใหม่: ติดตาม "ช่างออนไลน์" แบบ realtime + API ให้แอดมินดูได้
// - ✅ ใหม่: AI Chat Bot ที่ /api/ai/assist (OpenAI + FAQ fallback)
// =================================================================
require('dotenv').config();

console.log('My secret variable is:', process.env.TEST_VAR);

const express = require('express');
const cors = require('cors');
const knex = require('./db/knex');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const axios = require('axios');

const FRONTEND_ORIGIN = 'http://localhost:5173';
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN, methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }
});

// --- Middlewares & Setup ---
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Multer ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ===== Ensure DB column exists (users.accepting_jobs) =====
async function ensureAcceptingJobsColumn() {
  try {
    const has = await knex.schema.hasColumn('users', 'accepting_jobs');
    if (!has) {
      await knex.schema.table('users', (t) => {
        t.integer('accepting_jobs').notNullable().defaultTo(1); // 1=เปิดรับงาน (default)
      });
      console.log('✅ Added users.accepting_jobs');
    }
  } catch (e) {
    console.error('ensureAcceptingJobsColumn error:', e.message);
  }
}
ensureAcceptingJobsColumn();

/* =========================
   Socket.IO (รองรับหลายแท็บ/หลายอุปกรณ์) + Online Techs
   ========================= */
// เก็บ userId -> Set<socketId>
const userSockets = new Map();

// ส่งจำนวน/รายชื่อช่างที่ออนไลน์ให้ทุก client
async function broadcastOnlineTechnicians() {
  try {
    const onlineIds = Array.from(userSockets.keys()).map(Number);
    if (onlineIds.length === 0) {
      io.emit('technicians_online', { count: 0, technicians: [] });
      return;
    }
    const techs = await knex('users')
      .select('id', 'name', 'email', 'accepting_jobs')
      .whereIn('id', onlineIds)
      .andWhere({ role: 'Technician' });

    io.emit('technicians_online', { count: techs.length, technicians: techs });
  } catch (e) {
    console.error('broadcastOnlineTechnicians error:', e.message);
  }
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // ให้ client ส่ง userId ทันทีหลัง login
  socket.on('register_user', async (userId) => {
    if (!userId) return;
    const key = String(userId);
    if (!userSockets.has(key)) userSockets.set(key, new Set());
    userSockets.get(key).add(socket.id);
    await broadcastOnlineTechnicians();
  });

  socket.on('join_ticket_room', (ticketId) => socket.join(`ticket_${ticketId}`));
  socket.on('leave_ticket_room', (ticketId) => socket.leave(`ticket_${ticketId}`));

  socket.on('disconnect', async () => {
    for (const [uid, set] of userSockets.entries()) {
      if (set.has(socket.id)) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(uid);
      }
    }
    await broadcastOnlineTechnicians();
    console.log('User disconnected:', socket.id);
  });
});

// --- Helpers ---
async function createAndEmitNotification(userId, ticketId, message) {
  try {
    const [{ id }] = await knex('notifications')
      .insert({ user_id: userId, ticket_id: ticketId, message })
      .returning('id');
    const n = await knex('notifications').where({ id }).first();
    // ส่งเฉพาะให้เจ้าของปลายทางถ้าออนไลน์
    const set = userSockets.get(String(userId));
    if (set) {
      for (const sid of set) io.to(sid).emit('new_notification', n);
    }
  } catch (e) { console.error('notify error', e); }
}

// Email optional (ไม่ตั้งค่า .env จะไม่ส่งและไม่ error)
const EMAIL_ENABLED = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const transporter = EMAIL_ENABLED ? nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
}) : null;

async function sendEmailNotification(to, subject, text) {
  if (!EMAIL_ENABLED) {
    console.log('[mail] skipped', { to, subject });
    return;
  }
  try { await transporter.sendMail({ from: `"Helpdesk System" <${process.env.EMAIL_USER}>`, to, subject, text }); }
  catch (e) { console.error('mail error', e?.message || e); }
}

async function sendLineNotification(token, message) {
  if (!token) return;
  try {
    await axios.post('https://notify-api.line.me/api/notify', `message=${message}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Bearer ${token}` }
    });
  } catch (e) { console.error('line error', e?.response?.data || e.message); }
}

/* ==========================================================
   ✅ AI Chat Bot (OpenAI + FAQ fallback)
   - endpoint: POST /api/ai/assist
   - body: { userId?: number, message: string, history?: [{role, content}] }
   ========================================================== */
let openai = null;
try {
  const OpenAI = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ AI Chat: OpenAI client initialized');
  } else {
    console.log('⚠️ AI Chat: OPENAI_API_KEY not set -> using FAQ fallback only');
  }
} catch (e) {
  console.log('⚠️ AI Chat: openai package not installed -> using FAQ fallback only');
}

// FAQ พื้นฐาน (fallback)
const BASIC_FAQ = [
  {
    q: /อินเทอร์เน็ต|เน็ต|wifi|ไวไฟ/i,
    a: `ตรวจสอบเบื้องต้น:
1) รีสตาร์ทเราท์เตอร์/Access Point และรอ 2–3 นาที
2) ทดสอบสาย LAN/สลับพอร์ต
3) ใช้คำสั่ง ping (Windows: cmd -> ping 8.8.8.8)
4) ถ้าขึ้น "Unidentified network" ให้ลอง ipconfig /release และ ipconfig /renew`,
  },
  {
    q: /พิมพ์|ปริ้น|ปริ้นเตอร์|printer/i,
    a: `แก้ปัญหาปริ้นไม่ออก:
1) เช็คไฟ/กระดาษ/หมึก
2) ลบคิวงานค้างใน See what's printing
3) รีสตาร์ทบริการ Print Spooler
4) อัปเดตไดรเวอร์รุ่นล่าสุด`,
  },
  {
    q: /อีเมล|email|เมล/i,
    a: `อีเมลส่งไม่ออก/รับไม่เข้า:
1) ตรวจสอบความจุเมลบ็อกซ์
2) เช็ค SMTP/IMAP/POP และพอร์ต
3) ลองส่งภายในโดเมนเดียวกันก่อน
4) ตรวจสอบโฟลเดอร์สแปม/บล็อกไฟล์แนบ`,
  },
];

function getBasicFaqAnswer(text = '') {
  for (const item of BASIC_FAQ) {
    if (item.q.test(text)) return item.a;
  }
  return null;
}

app.post('/api/ai/assist', async (req, res) => {
  try {
    const { userId, message, history = [] } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required (string)' });
    }

    const faq = getBasicFaqAnswer(message);

    // ถ้าไม่มี OpenAI -> ตอบด้วย FAQ หรือ fallback
    if (!openai) {
      return res.json({
        reply: faq || 'ตอนนี้โหมด AI ปิดอยู่ กรุณาบอกอุปกรณ์/อาการ/เวลาเกิดเหตุ/รูปภาพ เพื่อช่วยให้ทีมช่างแก้ไขได้เร็วขึ้นครับ',
        source: faq ? 'faq' : 'fallback',
      });
    }

    const sysPrompt = `
คุณคือแชตบอทช่วยเหลือก่อนแจ้งซ่อมสำหรับระบบ IT Helpdesk (ภาษาไทย)
เป้าหมาย:
- ช่วยวิเคราะห์ปัญหาเบื้องต้นและแนะนำวิธีตรวจสอบ/แก้ไขอย่างปลอดภัย
- ขอข้อมูลสำคัญที่ช่างต้องการ: อุปกรณ์/รุ่น, อาการ, ความถี่, เวลาเกิด, สถานที่/แผนก, รูปภาพ, error text
- จัดรูปแบบข้อมูลที่ควรแนบในใบแจ้งซ่อม (หัวข้อ, รายละเอียด, ความเร่งด่วน)
- หากเป็นเรื่องอินเทอร์เน็ต/ปริ้นเตอร์/อีเมล ให้มีเช็กลิสต์ทีละข้อ
- น้ำเสียงสุภาพ กระชับ ไม่แต่งเรื่อง ถ้าข้อมูลไม่พอให้ถามต่อ
`;
    const faqContext = BASIC_FAQ.map((f, i) => `Q${i + 1}: ${f.q} -> ${f.a}`).join('\n');
    const compactHistory = Array.isArray(history) ? history.slice(-8) : [];

    const messages = [
      { role: 'system', content: sysPrompt },
      { role: 'system', content: `FAQ hints (สรุป):\n${faqContext}` },
      ...compactHistory,
      { role: 'user', content: message },
    ];

    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 600,
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      faq ||
      'ฉันยังไม่แน่ใจ ลองบอกรายละเอียดเพิ่มเติม (อุปกรณ์/อาการ/เวลา/ภาพ) ได้ไหมครับ';
    res.json({ reply, source: 'openai' });
  } catch (e) {
    console.error('POST /api/ai/assist error:', e?.response?.data || e.message || e);
    const { message } = req.body || {};
    const faq = getBasicFaqAnswer(message);
    res.json({
      reply: faq || 'ตอนนี้ระบบ AI ไม่ตอบสนอง ลองใหม่อีกครั้ง หรือแนบรายละเอียดเพิ่มเพื่อช่วยให้ช่างตรวจสอบได้เร็วขึ้นครับ',
      source: faq ? 'faq' : 'fallback',
    });
  }
});

// --- Auth ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    const [{ id }] = await knex('users')
      .insert({ name, email, password, role: 'User' })
      .returning('id');
    io.emit('user_updated');
    res.status(201).json({ id, name, email, role: 'User' });
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed: users.email') || e.message.includes('duplicate key value violates unique constraint')) return res.status(409).json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว' });
    console.error('register', e); res.status(500).json({ error: 'ไม่สามารถสมัครสมาชิกได้' });
  }
});
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await knex('users').where({ email }).first();
    if (u && u.password === password) {
      return res.json({ id: u.id, name: u.name, email: u.email, role: u.role, accepting_jobs: u.accepting_jobs ?? 1 });
    }
    res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  } catch (e) { console.error('login', e); res.status(500).json({ error: 'ไม่สามารถเข้าสู่ระบบได้' }); }
});

// --- Users ---
app.get('/api/users', async (_req, res) => {
  try { res.json(await knex('users').select('id', 'name', 'email', 'role')); }
  catch { res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' }); }
});
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params; const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'กรุณากรอกชื่อและอีเมล' });
    const cnt = await knex('users').where({ id }).update({ name, email });
    if (!cnt) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
    io.emit('user_updated');
    const user = await knex('users').select('id', 'name', 'email', 'role').where({ id }).first();
    res.json(user);
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed: users.email') || e.message.includes('duplicate key value violates unique constraint')) return res.status(409).json({ error: 'อีเมลนี้มีผู้ใช้งานอื่นแล้ว' });
    console.error('update user', e); res.status(500).json({ error: 'ไม่สามารถอัปเดตโปรไฟล์ได้' });
  }
});
app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params; const { role } = req.body;
    if (!['User', 'Technician', 'Admin'].includes(role)) return res.status(400).json({ error: 'Invalid role specified.' });
    const cnt = await knex('users').where({ id }).update({ role });
    if (!cnt) return res.status(404).json({ error: 'User not found.' });
    io.emit('user_updated'); res.json({ message: `User ${id} role updated to ${role}` });
  } catch { res.status(500).json({ error: 'ไม่สามารถอัปเดต Role ได้' }); }
});

// --- ME endpoints (ใช้ userId จาก query) ---
app.get('/api/me', async (req, res) => {
  try {
    const uid = Number(req.query.userId);
    if (!uid) return res.status(400).json({ message: 'userId is required' });
    const user = await knex('users')
      .select('id', 'name', 'email', 'role', 'accepting_jobs')
      .where({ id: uid }).first();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) { console.error('GET /api/me', e); res.status(500).json({ message: 'Server error' }); }
});
app.put('/api/me', async (req, res) => {
  try {
    const uid = Number(req.query.userId);
    if (!uid) return res.status(400).json({ message: 'userId is required' });
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'กรุณากรอกชื่อและอีเมล' });
    const cnt = await knex('users').where({ id: uid }).update({ name, email });
    if (!cnt) return res.status(404).json({ message: 'User not found' });
    const updated = await knex('users').select('id', 'name', 'email', 'role', 'accepting_jobs').where({ id: uid }).first();
    io.emit('user_updated'); res.json(updated);
  } catch (e) {
    if (e.message?.includes('UNIQUE constraint failed: users.email') || e.message.includes('duplicate key value violates unique constraint')) return res.status(409).json({ message: 'อีเมลนี้มีผู้ใช้งานแล้ว' });
    console.error('PUT /api/me', e); res.status(500).json({ message: 'ไม่สามารถอัปเดตโปรไฟล์ได้' });
  }
});
// เปิด/ปิดรับงานของช่าง
app.put('/api/me/availability', async (req, res) => {
  try {
    const uid = Number(req.query.userId);
    if (!uid) return res.status(400).json({ message: 'userId is required' });
    const { accepting } = req.body; // boolean
    const val = accepting ? 1 : 0;
    const cnt = await knex('users').where({ id: uid }).update({ accepting_jobs: val });
    if (!cnt) return res.status(404).json({ message: 'User not found' });
    const updated = await knex('users')
      .select('id', 'name', 'email', 'role', 'accepting_jobs')
      .where({ id: uid }).first();

    io.emit('technician_availability_changed', { userId: uid, accepting: !!val });
    await broadcastOnlineTechnicians(); // เผื่อ UI แสดงเฉพาะช่างที่ "ออนไลน์ + รับงาน"
    res.json(updated);
  } catch (e) {
    console.error('PUT /api/me/availability', e);
    res.status(500).json({ message: 'อัปเดตสถานะรับงานไม่สำเร็จ' });
  }
});

/* --- Admin: online technicians snapshot (REST) --- */
app.get('/api/technicians/online', async (_req, res) => {
  try {
    const onlineIds = Array.from(userSockets.keys()).map(Number);
    if (onlineIds.length === 0) return res.json({ count: 0, technicians: [] });

    const techs = await knex('users')
      .select('id', 'name', 'email', 'accepting_jobs')
      .whereIn('id', onlineIds)
      .andWhere({ role: 'Technician' });

    res.json({ count: techs.length, technicians: techs });
  } catch (e) {
    console.error('/api/technicians/online', e);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลช่างออนไลน์ได้' });
  }
});

// --- Tickets ---
app.get('/api/tickets', async (req, res) => {
  try {
    const { userId, technicianId } = req.query;
    const uid = Number(userId);
    const tid = Number(technicianId);

    console.log('[GET /api/tickets] userId=', userId, 'technicianId=', technicianId);

    let q = knex('tickets').select('*').orderBy('created_at', 'desc');
    if (uid) q.where({ user_id: uid });
    if (tid) q.where({ technician_id: tid });

    let tickets = await q;

    console.log('[GET /api/tickets] result count =', tickets.length);

    // กัน JSON แตก
    tickets = tickets.map(t => {
      let logs = [];
      try { logs = t.logs ? JSON.parse(t.logs) : []; } catch { logs = []; }
      return { ...t, logs };
    });

    res.json(tickets);
  } catch (e) {
    console.error('[GET /api/tickets] error', e);
    res.status(500).json({ error: e.message });
  }
});
app.put('/api/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params; const update = req.body;
    const before = await knex('tickets').where({ id }).first();
    if (!before) return res.status(404).json({ error: 'Ticket not found.' });

    if (update.status) {
      const logs = before.logs ? (() => { try { return JSON.parse(before.logs); } catch { return []; } })() : [];
      logs.push({ status: update.status, timestamp: new Date().toISOString() });
      update.logs = JSON.stringify(logs);
    }
    const cnt = await knex('tickets').where({ id }).update(update);
    if (!cnt) return res.status(404).json({ error: 'Ticket not found.' });

    const after = await knex('tickets').where({ id }).first();
    after.logs = (() => { try { return JSON.parse(after.logs); } catch { return []; } })();
    io.emit('ticket_updated', after);

    const ticketUser = await knex('users').where({ id: after.user_id }).first();
    if (update.technician_id && before.technician_id !== update.technician_id) {
      await createAndEmitNotification(update.technician_id, id, `คุณได้รับมอบหมายงานใหม่: "${after.title}"`);
    }
    if (update.status && before.status !== update.status) {
      const msg = `📢 อัปเดตสถานะ\nงาน: "${after.title}"\nสถานะใหม่: ${update.status}`;
      if (ticketUser?.email) {
        sendEmailNotification(ticketUser.email, `[Helpdesk] อัปเดตสถานะงาน #${after.id}`, `${msg}\n\nตรวจสอบในแอปได้`);
      }
      await createAndEmitNotification(after.user_id, id, `สถานะงาน "${after.title}" เปลี่ยนเป็น ${update.status}`);
    }
    res.json(after);
  } catch (e) { console.error('update ticket', e); res.status(500).json({ error: 'ไม่สามารถอัปเดตใบแจ้งซ่อมได้' }); }
});
app.post('/api/tickets', upload.single('image'), async (req, res) => {
  try {
    const { title, description, building, floor, room, user_id } = req.body;
    if (!title || !description || !user_id) return res.status(400).json({ error: 'Title, description, and user_id are required.' });
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const initialLog = { status: 'Submitted', timestamp: new Date().toISOString(), user: 'System' };
    const [{ id }] = await knex('tickets')
      .insert({ title, description, building, floor, room, user_id, status: 'Submitted', image_url, logs: JSON.stringify([initialLog]) })
      .returning('id');
    const created = await knex('tickets').where({ id }).first();
    created.logs = (() => { try { return JSON.parse(created.logs); } catch { return []; } })();
    io.emit('new_ticket', created); res.status(201).json(created);
  } catch (e) { console.error('create ticket', e); res.status(500).json({ error: 'ไม่สามารถสร้างใบแจ้งซ่อมได้' }); }
});

// --- Notifications, Analytics, Inventory, Chat ---
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const n = await knex('notifications').where({ user_id: userId }).orderBy('created_at', 'desc').limit(20);
    res.json(n);
  } catch { res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลการแจ้งเตือนได้' }); }
});
app.put('/api/notifications/read', async (req, res) => {
  try { await knex('notifications').where({ user_id: req.body.userId, is_read: false }).update({ is_read: true }); res.json({ message: 'All notifications marked as read.' }); }
  catch { res.status(500).json({ error: 'ไม่สามารถอัปเดตสถานะการแจ้งเตือนได้' }); }
});
app.get('/api/analytics/stats', async (_req, res) => {
  try {
    const totalTickets = await knex('tickets').count('id as count').first();
    const avgRating = await knex('tickets').whereNotNull('rating').avg('rating as avg').first();
    const totalUsers = await knex('users').count('id as count').first();
    const totalTechnicians = await knex('users').where({ role: 'Technician' }).count('id as count').first();
    res.json({ totalTickets: totalTickets.count, avgRating: avgRating.avg ? parseFloat(avgRating.avg).toFixed(2) : 'N/A', totalUsers: totalUsers.count, totalTechnicians: totalTechnicians.count });
  } catch (e) { console.error('stats', e); res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลสถิติได้' }); }
});
app.get('/api/analytics/common-problems', async (_req, res) => {
  try {
    const common = await knex('tickets').select('title').count('id as count').groupBy('title').orderBy('count', 'desc').limit(5);
    res.json(common);
  } catch (e) { console.error('common', e); res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลปัญหาที่พบบ่อยได้' }); }
});
app.get('/api/inventory', async (_req, res) => {
  try { res.json(await knex('inventory').select('*').orderBy('created_at', 'desc')); }
  catch (e) { console.error('inventory', e); res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลครุภัณฑ์ได้' }); }
});
app.post('/api/inventory', async (req, res) => {
  try {
    const { name, code, location, purchase_date, status } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'กรุณากรอกชื่อและรหัสครุภัณฑ์' });
    const [{ id }] = await knex('inventory')
      .insert({ name, code, location, purchase_date, status })
      .returning('id');
    const item = await knex('inventory').where({ id }).first();
    io.emit('inventory_updated'); res.status(201).json(item);
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed') || e.message.includes('duplicate key value violates unique constraint')) return res.status(409).json({ error: 'รหัสครุภัณฑ์นี้มีอยู่แล้วในระบบ' });
    console.error('inv create', e); res.status(500).json({ error: 'ไม่สามารถเพิ่มครุภัณฑ์ได้' });
  }
});
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params; const { name, code, location, purchase_date, status } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'กรุณากรอกชื่อและรหัสครุภัณฑ์' });
    const cnt = await knex('inventory').where({ id }).update({ name, code, location, purchase_date, status });
    if (!cnt) return res.status(404).json({ error: 'ไม่พบครุภัณฑ์' });
    const item = await knex('inventory').where({ id }).first();
    io.emit('inventory_updated'); res.json(item);
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed') || e.message.includes('duplicate key value violates unique constraint')) return res.status(409).json({ error: 'รหัสครุภัณฑ์นี้มีผู้ใช้งานอื่นแล้ว' });
    console.error('inv update', e); res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลครุภัณฑ์ได้' });
  }
});
app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params; const cnt = await knex('inventory').where({ id }).del();
    if (!cnt) return res.status(404).json({ error: 'ไม่พบครุภัณฑ์' });
    io.emit('inventory_updated'); res.json({ message: `ลบครุภัณฑ์ ID: ${id} สำเร็จ` });
  } catch (e) { console.error('inv delete', e); res.status(500).json({ error: 'ไม่สามารถลบครุภัณฑ์ได้' }); }
});

// --- Chat ---
app.get('/api/tickets/:id/messages', async (req, res) => {
  try { res.json(await knex('chat_messages').where({ ticket_id: req.params.id }).orderBy('created_at', 'asc')); }
  catch (e) { console.error('get messages', e); res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแชทได้' }); }
});
app.post('/api/tickets/:id/messages', async (req, res) => {
  try {
    const { id: ticket_id } = req.params; const { sender_id, message } = req.body;
    if (!sender_id || !message) return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    const [{ id: mid }] = await knex('chat_messages')
      .insert({ ticket_id, sender_id, message })
      .returning('id');
    const m = await knex('chat_messages').where({ id: mid }).first();
    io.to(`ticket_${ticket_id}`).emit('new_message', m);
    const t = await knex('tickets').where({ id: ticket_id }).first();
    if (t) {
      const recipientId = sender_id === t.user_id ? t.technician_id : t.user_id;
      if (recipientId) {
        const sender = await knex('users').where({ id: sender_id }).first();
        await createAndEmitNotification(recipientId, ticket_id, `${sender.name} ได้ส่งข้อความในงาน: "${t.title}"`);
      }
    }
    res.status(201).json(m);
  } catch (e) { console.error('send message', e); res.status(500).json({ error: 'ไม่สามารถส่งข้อความได้' }); }
});

const PORT = 5000;
server.listen(PORT, () => console.log(`✅ Server with all APIs is running on http://localhost:${PORT}`));