import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Force IPv4 first to prevent ENETUNREACH errors with Gmail SMTP on IPv6
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Load .env from root

const app = express();
app.use(cors());
app.use(express.json());

const SENDER_EMAIL = process.env.SENDER_EMAIL;
const APP_PASSWORD = process.env.APP_PASSWORD;
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const OWNER_NAME = process.env.OWNER_NAME || 'Nursery Owner';

console.log(`[Config] SENDER_EMAIL: ${SENDER_EMAIL ? SENDER_EMAIL : 'ankammakatikala@gmail.com'}`);
console.log(`[Config] APP_PASSWORD: ${APP_PASSWORD ? '✅ Set' : 'ankammakatikala@gmail.com'}`);
console.log(`[Config] OWNER_EMAIL: ${OWNER_EMAIL ? OWNER_EMAIL : 'ankammakatikala@gmail.com'}`);
console.log(`[Config] OWNER_NAME: ${OWNER_NAME}`);

// In-memory OTP storage (for demo purposes)
const otpStorage = {};

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: SENDER_EMAIL,
        pass: APP_PASSWORD,
    },
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 10000,   // 10s greeting timeout
    socketTimeout: 15000,     // 15s socket timeout
    family: 4, // Force IPv4
    tls: {
        rejectUnauthorized: false,
    },
});

app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, text, html, qrData } = req.body;

        const mailOptions = {
            from: `"Green Plant Selling" <${SENDER_EMAIL}>`,
            to: to,
            subject: subject,
            text: text,
            html: html,
        };

        if (qrData) {
            const qrBuffer = await QRCode.toBuffer(qrData);
            mailOptions.attachments = [
                {
                    filename: 'order-qrcode.png',
                    content: qrBuffer
                }
            ];
        }

        let info = await transporter.sendMail(mailOptions);

        console.log("Email sent successfully: %s", info.messageId);
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, error: 'Failed to send email' });
    }
});

// --- Owner Notification Endpoint ---
app.post('/api/send-order-to-owner', async (req, res) => {
    try {
        const { orderId, userName, userEmail, items, totalCost, orderTime } = req.body;

        if (!OWNER_EMAIL) {
            console.error("OWNER_EMAIL not set in .env");
            return res.status(500).json({ success: false, error: 'Owner email not configured' });
        }

        // Build items HTML table rows
        const itemRows = items.map(item =>
            `<tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
            </tr>`
        ).join('');

        const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🌿 New Order Received!</h1>
                <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Order #${orderId}</p>
                <p style="color: #d1fae5; margin: 4px 0 0; font-size: 13px;">Dear ${OWNER_NAME}</p>
            </div>
            <div style="padding: 32px;">
                <h2 style="color: #065f46; font-size: 18px; margin: 0 0 16px;">👤 Customer Details</h2>
                <table style="width: 100%; margin-bottom: 24px;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name:</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #111827;">${userName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #111827;">${userEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order Time:</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #111827;">${orderTime}</td>
                    </tr>
                </table>

                <h2 style="color: #065f46; font-size: 18px; margin: 0 0 16px;">🌱 Plants Ordered</h2>
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background: #ecfdf5;">
                            <th style="padding: 12px 16px; text-align: left; color: #065f46; font-size: 13px;">Plant Name</th>
                            <th style="padding: 12px 16px; text-align: center; color: #065f46; font-size: 13px;">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>

                <div style="margin-top: 24px; padding: 16px; background: #ecfdf5; border-radius: 12px; text-align: center;">
                    <span style="color: #6b7280; font-size: 14px;">Total Amount:</span>
                    <span style="color: #059669; font-size: 24px; font-weight: 700; margin-left: 8px;">₹${totalCost}</span>
                </div>
            </div>
            <div style="padding: 16px 32px; background: #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
                Green Plant Selling — Boutique Botanicals
            </div>
        </div>`;

        const plainText = `New Order #${orderId}\n\nCustomer: ${userName}\nEmail: ${userEmail}\nOrder Time: ${orderTime}\n\nItems:\n${items.map(i => `- ${i.name} (x${i.quantity})`).join('\n')}\n\nTotal: ₹${totalCost}`;

        await transporter.sendMail({
            from: `"Green Plant Selling" <${SENDER_EMAIL}>`,
            to: OWNER_EMAIL,
            subject: `🌿 New Order #${orderId} from ${userName}`,
            text: plainText,
            html: htmlContent,
        });

        console.log(`✅ Owner notification sent to ${OWNER_EMAIL} for order #${orderId}`);
        res.status(200).json({ success: true, message: 'Owner notified successfully' });
    } catch (error) {
        console.error("Error sending owner notification:", error);
        res.status(500).json({ success: false, error: 'Failed to notify owner' });
    }
});

// --- New User Registration Notification ---
app.post('/api/notify-new-user', async (req, res) => {
    try {
        const { username, email } = req.body;

        if (!OWNER_EMAIL) {
            console.error("OWNER_EMAIL not set in .env");
            return res.status(500).json({ success: false, error: 'Owner email not configured' });
        }

        const registrationTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New User Registered!</h1>
                <p style="color: #dbeafe; margin: 8px 0 0; font-size: 13px;">Dear ${OWNER_NAME}</p>
            </div>
            <div style="padding: 32px;">
                <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">A new customer has created an account on <strong>Green Plant Selling</strong>.</p>
                <table style="width: 100%; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 14px 20px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">👤 Username</td>
                        <td style="padding: 14px 20px; font-weight: 700; color: #111827; font-size: 15px; border-bottom: 1px solid #f3f4f6;">${username}</td>
                    </tr>
                    <tr>
                        <td style="padding: 14px 20px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">📧 Email</td>
                        <td style="padding: 14px 20px; font-weight: 700; color: #111827; font-size: 15px; border-bottom: 1px solid #f3f4f6;">${email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 14px 20px; color: #6b7280; font-size: 14px;">🕐 Registered At</td>
                        <td style="padding: 14px 20px; font-weight: 700; color: #111827; font-size: 15px;">${registrationTime}</td>
                    </tr>
                </table>
            </div>
            <div style="padding: 16px 32px; background: #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
                Green Plant Selling — Boutique Botanicals
            </div>
        </div>`;

        await transporter.sendMail({
            from: `"Green Plant Selling" <${SENDER_EMAIL}>`,
            to: OWNER_EMAIL,
            subject: `🎉 New User Registered: ${username} (${email})`,
            text: `New User Registration\n\nUsername: ${username}\nEmail: ${email}\nRegistered At: ${registrationTime}`,
            html: htmlContent,
        });

        console.log(`✅ New user notification sent to owner for: ${username} (${email})`);
        res.status(200).json({ success: true, message: 'Owner notified of new user' });
    } catch (error) {
        console.error("Error sending new user notification:", error);
        res.status(500).json({ success: false, error: 'Failed to notify owner of new user' });
    }
});

app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email required' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStorage[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 min expiration

        await transporter.sendMail({
            from: `"Green Plant Selling" <${SENDER_EMAIL}>`,
            to: email,
            subject: "Your OTP Verification Code",
            text: `Hello,\n\nYour OTP for registration is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nFrom your green plant selling project.`,
        });

        console.log(`OTP sent to ${email}`);
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
});

app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, error: 'Email and OTP required' });
    }

    const record = otpStorage[email];

    if (!record) {
        return res.status(400).json({ success: false, error: 'No OTP requested for this email' });
    }

    if (Date.now() > record.expiresAt) {
        delete otpStorage[email];
        return res.status(400).json({ success: false, error: 'OTP has expired' });
    }

    if (record.otp === otp) {
        delete otpStorage[email];
        return res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } else {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }
});

// Serve static frontend files in production
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Catch-all: serve index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Verify SMTP connection on startup
    transporter.verify()
        .then(() => console.log('✅ SMTP connection to Gmail verified successfully!'))
        .catch((err) => console.error('❌ SMTP connection failed:', err.message));
});
