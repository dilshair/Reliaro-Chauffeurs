# Reliaro Chauffeurs — Dynamic Website

Full-stack Node.js website with:
- Live price calculator (Google Maps Distance Matrix API)
- Customer accounts + booking history
- Stripe payment processing
- Automated confirmation emails
- Admin dashboard to manage all bookings

## Tech Stack

| Layer       | Technology                           |
|-------------|--------------------------------------|
| Runtime     | Node.js 18+                          |
| Framework   | Express.js                           |
| Templating  | EJS                                  |
| Database    | SQLite (via better-sqlite3)          |
| Payments    | Stripe                               |
| Email       | Nodemailer (any SMTP)                |
| Maps        | Google Maps Distance Matrix + Places |

---

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Create your .env file
```bash
cp .env.example .env
```
Open `.env` and fill in your values (see `.env.example` for all keys).

### 3. Start the server
```bash
npm run dev    # with auto-reload (nodemon)
# or
npm start      # production mode
```

Visit: http://localhost:3000
Admin:  http://localhost:3000/admin

The admin account is created automatically on first run using `ADMIN_EMAIL_LOGIN` and `ADMIN_PASSWORD` from your `.env`.

---

## Deployment on Railway (Recommended)

Railway is the easiest Node.js host. Free tier included.

### Step 1 — Create a Railway account
Go to [railway.app](https://railway.app) and sign up with GitHub.

### Step 2 — Push code to GitHub
```bash
git init
git add .
git commit -m "Initial Reliaro Chauffeurs build"
git remote add origin https://github.com/YOUR_USERNAME/reliaro-chauffeurs.git
git push -u origin main
```

### Step 3 — Deploy on Railway
1. Go to [railway.app/new](https://railway.app/new)
2. Click **Deploy from GitHub repo**
3. Select your `reliaro-chauffeurs` repository
4. Railway auto-detects Node.js — no config needed

### Step 4 — Set environment variables
In Railway dashboard → your project → **Variables**, add all values from `.env.example`:

| Key                   | Value                                        |
|-----------------------|----------------------------------------------|
| `GOOGLE_MAPS_API_KEY` | `AIzaSyDefawEPX6wDhJATPZu3lqgfCKRsApBVZ0`   |
| `SESSION_SECRET`      | a long random string (32+ characters)        |
| `STRIPE_PUBLIC_KEY`   | `pk_live_xxxx` from stripe.com               |
| `STRIPE_SECRET_KEY`   | `sk_live_xxxx` from stripe.com               |
| `STRIPE_WEBHOOK_SECRET` | from Stripe webhook dashboard              |
| `SMTP_HOST`           | e.g. `smtp.gmail.com`                        |
| `SMTP_PORT`           | `587`                                        |
| `SMTP_USER`           | your Gmail address                           |
| `SMTP_PASS`           | Gmail app password                           |
| `ADMIN_EMAIL_LOGIN`   | `admin@reliarochauffeurs.com`                |
| `ADMIN_PASSWORD`      | a strong password                            |
| `SITE_URL`            | `https://reliarochauffeurs.com`              |

### Step 5 — Connect your Cloudflare domain

Railway will give you a URL like `reliaro-xxxx.up.railway.app`.

**In Cloudflare dashboard** (your reliarochauffeurs.com zone):
1. Go to **DNS** → **Add Record**
2. Type: `CNAME`
3. Name: `@` (or `www`)
4. Target: `reliaro-xxxx.up.railway.app`
5. Proxy: ☁️ **Proxied** (orange cloud — this enables Cloudflare CDN)

**In Railway dashboard:**
1. Go to your project → **Settings** → **Domains**
2. Click **Add Custom Domain**
3. Enter `reliarochauffeurs.com`

SSL is automatic. Your site will be live at `https://reliarochauffeurs.com` within minutes.

---

## Environment Variables Explained

```env
# Server
PORT=3000                          # Railway sets this automatically
NODE_ENV=production

# Security — CHANGE THIS in production!
SESSION_SECRET=your-long-random-string-here

# Google Maps API
# Restrict this key to your domain in Google Cloud Console
GOOGLE_MAPS_API_KEY=AIzaSy...

# Stripe — get from stripe.com/dashboard
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email — Gmail example (use an App Password, not your normal password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=bookings@reliarochauffeurs.com
SMTP_PASS=xxxx xxxx xxxx xxxx     # 16-character Gmail App Password

# Admin account — created automatically on first startup
ADMIN_NAME=Reliaro Admin
ADMIN_EMAIL_LOGIN=admin@reliarochauffeurs.com
ADMIN_PASSWORD=YourStrongPasswordHere

# Used in email links
SITE_URL=https://reliarochauffeurs.com
```

---

## Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from **Developers → API Keys**
3. For webhooks:
   - Go to **Developers → Webhooks → Add endpoint**
   - URL: `https://reliarochauffeurs.com/payment/webhook`
   - Events: `payment_intent.succeeded`
   - Copy the **Signing secret** → paste as `STRIPE_WEBHOOK_SECRET`
4. Start with test keys (`pk_test_`, `sk_test_`) then switch to live

---

## Email Setup (Gmail)

1. Enable 2FA on your Google account
2. Go to **Google Account → Security → App passwords**
3. Create an App Password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

---

## Google Maps API Setup

Your key: `AIzaSyDefawEPX6wDhJATPZu3lqgfCKRsApBVZ0`

**APIs to enable** in Google Cloud Console:
- Maps JavaScript API (for Places Autocomplete on the frontend)
- Distance Matrix API (for server-side distance calculation)
- Places API

**Security** — add HTTP referrer restrictions:
```
https://reliarochauffeurs.com/*
https://www.reliarochauffeurs.com/*
http://localhost:3000/*
```

---

## Admin Panel

URL: `https://reliarochauffeurs.com/admin`

Features:
- Dashboard with booking stats and revenue
- View and manage all bookings
- Update booking status (pending → confirmed → completed)
- Send status update email to customer when you change status
- View registered customers

---

## Project Structure

```
reliaro-chauffeurs/
├── server.js              ← Express app entry point
├── package.json
├── .env.example           ← Copy to .env and fill in
├── .gitignore
├── db/
│   └── database.js        ← SQLite schema + auto-setup
├── routes/
│   ├── index.js           ← Homepage + POST /calculate
│   ├── auth.js            ← Login, register, logout
│   ├── booking.js         ← Booking form + confirmation
│   ├── payment.js         ← Stripe integration
│   ├── account.js         ← Customer dashboard
│   └── admin.js           ← Admin dashboard
├── middleware/
│   └── auth.js            ← requireAuth + requireAdmin
├── emails/
│   └── mailer.js          ← Nodemailer templates
├── views/
│   ├── partials/          ← head, nav, footer
│   ├── index.ejs          ← Homepage with calculator
│   ├── booking.ejs        ← Booking form
│   ├── booking-success.ejs
│   ├── payment.ejs        ← Stripe payment page
│   ├── auth/              ← Login + register
│   ├── account/           ← Customer dashboard
│   └── admin/             ← Admin dashboard
└── public/
    ├── css/
    │   ├── style.css      ← Full design system
    │   └── dashboard.css  ← Admin + account styles
    └── js/
        ├── main.js        ← Nav, mobile menu
        └── calculator.js  ← Price calculator logic
```

---

## Support

Questions about deployment? Common issues:

**"Cannot find module" error on Railway** → Make sure `npm install` is running. Check Railway build logs.

**Database not persisting** → Railway's filesystem is ephemeral. For production, upgrade to Railway's persistent volume or migrate to PostgreSQL (Railway offers free PostgreSQL).

**Emails not sending** → Double-check SMTP settings. For Gmail, ensure you're using an App Password, not your account password.

**Stripe payments not working** → Ensure you've added the webhook endpoint URL in Stripe dashboard and copied the signing secret correctly.
