<h1 align="center">🌿 Boutique Botanicals</h1>

<p align="center">
  <strong>A premium green plant selling and nursery management application.</strong><br>
  Built with React, Vite, Express, and integrated with Gemini AI.
</p>

<p align="center">
  <a href="https://render.com/deploy">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render">
  </a>
</p>

---

## 🌟 Features

- **Storefront & Catalog:** Browse a curated selection of beautiful botanical plants.
- **Smart Recommendations:** Powered by Gemini AI to help users find the perfect plant for their space.
- **Secure Authentication:** OTP-based user registration and login via Gmail SMTP.
- **Order Tracking:** QR code generation for seamless order management and tracking.
- **Modern UI:** Built with Tailwind CSS and Framer Motion for a smooth, responsive, and delightful user experience.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express |
| **Email** | Nodemailer (Gmail SMTP) |
| **AI** | Google Gemini API (`@google/genai`) |
| **QR Code** | `react-qr-code`, `@yudiel/react-qr-scanner` |
| **Deployment** | Render (Web Service) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- A Gmail account with [App Password](https://myaccount.google.com/apppasswords) enabled

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/boutique-botanicals.git
cd boutique-botanicals
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
SENDER_EMAIL="your_gmail@gmail.com"
APP_PASSWORD="your_gmail_app_password"
SERVER_PORT=3001
```

> **💡 Gmail App Password:** Enable 2-Step Verification on your Google Account → Go to [App Passwords](https://myaccount.google.com/apppasswords) → Generate a new password for "Mail".

### 3. Run the Application

**Start the backend server:**
```bash
node server/index.js
```

**In a new terminal, start the frontend dev server:**
```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | `http://localhost:3000` |
| Backend (Express) | `http://localhost:3001` |

---

## ☁️ Deploy to Render

This project is configured for one-command deployment on [Render](https://render.com). The Express server serves both the API and the built React frontend from a single service.

### Option A: One-Click Deploy (Recommended)

1. **Push your code to GitHub** (see [Git & Push](#-git--push-to-github) below).
2. Click the **Deploy to Render** button at the top of this README, or go to [Render Dashboard → Blueprints](https://dashboard.render.com/blueprints).
3. Connect your GitHub repository.
4. Render will read the `render.yaml` file and auto-configure the service.
5. **Set your environment variables** when prompted (see table below).
6. Click **Apply** and wait for the deploy to complete.

### Option B: Manual Setup via Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com) and click **New → Web Service**.
2. Connect your GitHub/GitLab repository.
3. Configure the service with the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `boutique-botanicals` |
| **Runtime** | `Node` |
| **Build Command** | `npm run render-build` |
| **Start Command** | `node server/index.js` |
| **Plan** | Free (or your preferred plan) |
| **Node Version** | `20.11.0` (set via `NODE_VERSION` env var) |

4. Under **Environment → Environment Variables**, add the variables from the table below.
5. Click **Deploy Web Service**.

### 🔑 Environment Variables (Required on Render)

Set these in the Render dashboard under your service → **Environment**:

| Variable | Description | Example |
|----------|-------------|---------|
| `SENDER_EMAIL` | Gmail address for sending OTP & receipts | `you@gmail.com` |
| `APP_PASSWORD` | Gmail App Password (not your regular password) | `abcd efgh ijkl mnop` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `NODE_VERSION` | Node.js version for the build | `20.11.0` |
| `SERVER_PORT` | Server port (Render uses `10000` by default) | `10000` |

> **⚠️ Important:** Never commit your `.env` file. The `.gitignore` already excludes it. Set secrets only through the Render dashboard.

### ✅ Post-Deployment Verification

Once deployed, Render will provide a URL like `https://boutique-botanicals.onrender.com`. Verify:

1. **Homepage loads** — Visit your Render URL and confirm the storefront renders.
2. **OTP works** — Register a new account and check that the OTP email arrives.
3. **AI features** — Test the Gemini-powered plant recommendations.
4. **Order flow** — Place a test order and verify the QR code email receipt.

> **💡 Tip:** On the free plan, the service spins down after 15 minutes of inactivity. The first request after idle may take ~30 seconds while it spins back up.

---

## 🏗️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview the production build locally |
| `npm run clean` | Remove the `dist` build folder |
| `npm run lint` | Run TypeScript type checking |
| `npm start` | Start the Express server (production) |
| `npm run render-build` | Full build for Render (`npm install && npm run build`) |

---

## 📦 Git & Push to GitHub

```bash
# Initialize (if not already done)
git init
git remote add origin https://github.com/YOUR_USERNAME/boutique-botanicals.git

# Stage, commit, and push
git add .
git commit -m "Add Render deployment configuration"
git push -u origin main
```

> After pushing, if you've connected Render to your GitHub repo, it will **automatically redeploy** on every push to `main`.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#) if you want to contribute.

## 📝 License

This project is privately licensed.
