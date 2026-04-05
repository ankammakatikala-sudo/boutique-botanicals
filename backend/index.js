import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ─── Supabase (credentials stay here, never exposed to frontend) ─────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─── Email helper ─────────────────────────────────────────────────────────────
const sendMail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SENDER_EMAIL, pass: process.env.APP_PASSWORD },
  });
  return transporter.sendMail({ from: process.env.SENDER_EMAIL, to, subject, text });
};

// ─── Auth routes ─────────────────────────────────────────────────────────────

// Check if email already registered
app.get('/api/auth/check-email', async (req, res) => {
  const { email } = req.query;
  try {
    const { data, error } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
    if (error) throw error;
    res.json({ exists: !!data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: authData.user.id, username, email, full_name: username, role: 'user' }]);
      if (profileError) throw profileError;

      // Notify owner
      sendMail(
        process.env.OWNER_EMAIL,
        'New User Registered',
        `New user: ${username} (${email}) just registered.`
      ).catch(console.error);
    }

    res.status(201).json({ user: authData.user, username });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('id', authData.user.id).single();
    if (profileError) throw profileError;

    res.json({ user: authData.user, profile });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Update password
app.post('/api/auth/update-password', async (req, res) => {
  const { password } = req.body;
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update profile (username)
app.patch('/api/profiles/me', async (req, res) => {
  const { userId, username } = req.body;
  try {
    const { error } = await supabase.from('profiles').update({ username }).eq('id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Product routes ───────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Product not found' });
  }
});

// ─── Order routes ─────────────────────────────────────────────────────────────

app.post('/api/orders', async (req, res) => {
  const { id, user_id, total, status } = req.body;
  try {
    const { error } = await supabase.from('orders').insert([{ id, user_id, total, status: status || 'pending' }]);
    if (error) throw error;
    res.status(201).json({ id, message: 'Order placed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/user/:user_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders').select('*').eq('user_id', req.params.user_id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const { error } = await supabase.from('orders').update({ status }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

app.get('/api/admin/orders', async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('id, username, email, role');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Email / notification routes ──────────────────────────────────────────────

app.post('/api/send-email', async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    const info = await sendMail(to, subject, text);
    res.json({ success: true, previewUrl: info?.response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Store OTP temporarily in memory (production should use Redis)
  global.otpStore = global.otpStore || {};
  global.otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  try {
    await sendMail(email, 'Your OTP Code', `Your OTP is: ${otp}\nThis code expires in 5 minutes.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const stored = global.otpStore?.[email];
  if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
    return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
  }
  delete global.otpStore[email];
  res.json({ success: true });
});

app.post('/api/send-order-to-owner', async (req, res) => {
  const { orderId, userName, userEmail, items, totalCost, orderTime } = req.body;
  const itemList = items.map(i => `- ${i.name} (x${i.quantity})`).join('\n');
  const text = `New Order #${orderId}\nCustomer: ${userName} (${userEmail})\nTime: ${orderTime}\nItems:\n${itemList}\nTotal: ₹${totalCost}`;
  try {
    await sendMail(process.env.OWNER_EMAIL, `New Order #${orderId}`, text);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notify-new-user', async (req, res) => {
  const { username, email } = req.body;
  try {
    await sendMail(process.env.OWNER_EMAIL, 'New User Registered', `${username} (${email}) just registered.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Status routes ────────────────────────────────────────────────────────────

app.get('/api/status/:user_id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('user_status').select('*').eq('user_id', req.params.user_id).maybeSingle();
    if (error) throw error;
    res.json(data || { is_online: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/status/update', async (req, res) => {
  const { user_id, is_online } = req.body;
  try {
    const { error } = await supabase.from('user_status').upsert({ user_id, is_online, last_seen: new Date().toISOString() });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Seed initial products ────────────────────────────────────────────────────

const initialProducts = [
  { id: '1', name: 'Monstera Deliciosa', price: 45.00, category: 'Indoor', image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=800', description: 'A beautiful Monstera plant with split leaves.', rating: 4.8, reviews: 124, stock: 15, is_featured: true },
  { id: '2', name: 'Snake Plant', price: 25.00, category: 'Indoor', image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=800', description: 'Low-maintenance Snake Plant for your home.', rating: 4.5, reviews: 89, stock: 20, is_featured: false },
];

const seedProducts = async () => {
  try {
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('products').insert(initialProducts);
      console.log('Initial products seeded.');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

seedProducts();

app.listen(process.env.PORT || 3001, () => {
  console.log(`✅ Backend running on port ${process.env.PORT || 3001}`);
  console.log(`🔐 Supabase credentials loaded from environment (not exposed to frontend)`);
});
