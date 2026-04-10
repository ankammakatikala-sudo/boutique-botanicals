import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ─── Firebase Admin SDK (Firestore) ──────────────────────────────────────────
// Initialize with the project ID from the frontend Firebase config
initializeApp({
  projectId: 'green-plant-silling',
});

const db = getFirestore();

// ─── Email helper ─────────────────────────────────────────────────────────────
const sendMail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SENDER_EMAIL, pass: process.env.APP_PASSWORD },
  });
  return transporter.sendMail({ from: process.env.SENDER_EMAIL, to, subject, text });
};

// ─── Auth routes (Firestore-based) ───────────────────────────────────────────

// Check if email already registered
app.get('/api/auth/check-email', async (req, res) => {
  const { email } = req.query;
  try {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    res.json({ exists: !snapshot.empty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const uid = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await db.collection('users').doc(uid).set({
      uid,
      username,
      email,
      password, // Already hashed from frontend
      createdAt: new Date().toISOString(),
    });

    // Notify owner
    sendMail(
      process.env.OWNER_EMAIL,
      'New User Registered',
      `New user: ${username} (${email}) just registered.`
    ).catch(console.error);

    res.status(201).json({ user: { uid, email, username } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = snapshot.docs[0].data();
    if (userData.password === password) {
      res.json({
        user: { uid: userData.uid, email: userData.email },
        profile: { username: userData.username, email: userData.email },
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Update password
app.post('/api/auth/update-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  try {
    const snapshot = await db.collection('users').where('uid', '==', userId).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userDoc = snapshot.docs[0];
    if (userDoc.data().password !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    await userDoc.ref.update({ password: newPassword });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update profile (username)
app.patch('/api/profiles/me', async (req, res) => {
  const { userId, username } = req.body;
  try {
    const snapshot = await db.collection('users').where('uid', '==', userId).limit(1).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({ username });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Order routes (Firestore-based) ──────────────────────────────────────────

app.post('/api/orders', async (req, res) => {
  const { id, user_id, total, status, items } = req.body;
  try {
    await db.collection('orders').doc(id).set({
      id,
      userId: user_id,
      total,
      status: status || 'Ordered',
      items: items || [],
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ id, message: 'Order placed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/user/:user_id', async (req, res) => {
  try {
    const snapshot = await db
      .collection('orders')
      .where('userId', '==', req.params.user_id)
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snapshot.docs.map((d) => d.data()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    await db.collection('orders').doc(req.params.id).update({ status });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin routes (Firestore-based) ──────────────────────────────────────────

app.get('/api/admin/orders', async (req, res) => {
  try {
    const snapshot = await db.collection('orders').get();
    res.json(snapshot.docs.map((d) => d.data()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    res.json(
      snapshot.docs.map((d) => {
        const data = d.data();
        return { uid: data.uid, username: data.username, email: data.email };
      })
    );
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
  const itemList = items.map((i) => `- ${i.name} (x${i.quantity})`).join('\n');
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

// ─── Status routes (Firestore-based) ─────────────────────────────────────────

app.get('/api/status/:user_id', async (req, res) => {
  try {
    const snapshot = await db
      .collection('user_status')
      .where('user_id', '==', req.params.user_id)
      .limit(1)
      .get();
    if (snapshot.empty) {
      res.json({ is_online: false });
    } else {
      res.json(snapshot.docs[0].data());
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/status/update', async (req, res) => {
  const { user_id, is_online } = req.body;
  try {
    await db.collection('user_status').doc(user_id).set(
      { user_id, is_online, last_seen: new Date().toISOString() },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve Frontend (combined single URL) ────────────────────────────────────
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ App running at http://localhost:${PORT}`);
  console.log(`🔥 Firebase Firestore connected (project: green-plant-silling)`);
});
