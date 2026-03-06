<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

<h1 align="center">🌿 Boutique Botanicals</h1>

<p align="center">
  <strong>A premium green plant selling and nursery management application.</strong><br>
  Built with React, Vite, Express, and integrated with Gemini AI.
</p>

---

## 🌟 Features

- **Storefront & Catalog:** Browse a curated selection of beautiful botanical plants.
- **Smart Recommendations:** Powered by Gemini AI to help users find the perfect plant for their space.
- **Secure Authentication:** OTP-based user registration and login via Gmail SMTP.
- **Order Tracking:** QR code generation for seamless order management and tracking.
- **Modern UI:** Built with Tailwind CSS and Framer Motion for a smooth, responsive, and delightful user experience.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS + Framer Motion
- **Icons:** Lucide React
- **QR Code:** `react-qr-code`, `react-qr-scanner`

### Backend
- **Server:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`)
- **Email Service:** Nodemailer (Gmail SMTP)
- **AI Integration:** Google Gemini API (`@google/genai`)

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (Node Package Manager)

### 1. Clone the Repository & Install Dependencies

Open your terminal in the project directory and install all required standard and development dependencies:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory of the project. You can copy the structure from `.env.example`:

```bash
cp .env.example .env
```

Open the `.env` file and configure the following variables:

```env
# Gemini AI Configuration
GEMINI_API_KEY="your_gemini_api_key_here"

# Application URL
APP_URL="http://localhost:3000"

# Email Configuration (for OTP and order receipts)
SENDER_EMAIL="your_gmail_address@gmail.com"
APP_PASSWORD="your_gmail_app_password"

# Server Configuration
SERVER_PORT=3001
```

> **Note:** To get a Gmail App Password, ensure 2-Step Verification is enabled on your Google Account, then generate an App Password under Security settings.

### 3. Start the Backend Server (Express)

The backend handles email notifications, OTP verification, and AI requests.

Open a terminal window and run:
```bash
node server/index.js
```
The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

### 4. Start the Frontend Application (Vite/React)

Open a **new** terminal window and run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or `http://localhost:5173` depending on your Vite configuration).

---

## 🏗️ Available Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the app for production to the `dist` folder.
- `npm run preview`: Locally preview the production build.
- `npm run clean`: Removes the `dist` build folder.
- `npm run lint`: Runs TypeScript type checking.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#) if you want to contribute.

## 📝 License

This project is privately licensed.
