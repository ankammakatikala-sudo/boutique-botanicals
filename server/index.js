import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // Load .env from root

const app = express();
app.use(cors());
app.use(express.json());

const SENDER_EMAIL = process.env.SENDER_EMAIL;
const APP_PASSWORD = process.env.APP_PASSWORD;

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

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
    console.log(`Email Notification Server running on http://localhost:${PORT} with Gmail SMTP`);
});
