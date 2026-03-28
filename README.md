# Rubrix

Rubrix is a Microsoft Word add-in for educators with AI-assisted writing, grading, and detection workflows.

## What This Build Includes

- Landing page always visible first.
- Top-right `Login / Sign up` CTA when signed out.
- Feature actions blocked until authentication.
- Supabase auth providers:
  - Email magic link
  - Google
  - Microsoft (Azure)
  - Facebook
- Optional provider guards via env flags so unavailable providers are disabled in UI.
- Usage tracker UI (words left this month) in header/menu and landing.
- Usage meter with near-limit warnings (info/warning/critical thresholds).
- Plan-aware feature gating + usage enforcement in app actions.
- Stripe test-mode checkout endpoint + webhook scaffold.
- Supabase-compatible SQL migration for billing plans, subscriptions, top-ups, and usage ledger.

## Billing Model Implemented

### Trial

- Trial unlocks all features up to **10,000 words** total.
- After trial words are exhausted, subscription is required.

### Plans

| Plan | Monthly | Annual (20% off) | Capacity | AI Detector | Plagiarism |
|---|---:|---:|---:|---|---|
| Basic | $13.99 | $134.30 | 200,000 words/month | No | No |
| Plus | $19.99 | $191.90 | 200,000 words/month | Yes | No |
| 360 | $44.99 | $431.90 | 200,000 words/month | Yes | Yes |
| Basic HD | $29.99 | $287.90 | 2,000,000 words/month | No | No |
| Plus HD | $59.99 | $575.90 | 2,000,000 words/month | Yes | No |
| 360 HD | $119.99 | $1,151.90 | 2,000,000 words/month | Yes | Yes |

Feature access by plan:
- Basic/Basic HD: comments + grade paper + writing assist
- Plus/Plus HD: Basic features + AI detector
- 360/360 HD: Plus features + plagiarism

### Top-ups (No Rollover)

- Each pack = **50,000 words** (25 essays x 2,000 words).
- Top-up categories:
  - Grading/Writing top-up
  - AI detection top-up
  - Plagiarism top-up

## Project Structure

- Frontend app: `src/taskpane/*`
- Winston proxy APIs: `api/winston/*`
- Stripe APIs:
  - `api/stripe/checkout.js`
  - `api/stripe/webhook.js`
- Supabase migration:
  - `supabase/migrations/20260324093000_auth_billing_usage.sql`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env
```

3. Configure `.env` values.

4. Start dev server:

```bash
npm run dev-server
```

5. Build:

```bash
npm run build
```

## Required Environment Variables

See `.env.example` for the complete list. Key groups:

- AI providers: `API_KEY`, `WINSTON_API_KEY`
- Supabase: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_AUTH_REDIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - Optional provider guards: `SUPABASE_AUTH_ENABLED_PROVIDERS`, `SUPABASE_AUTH_ENABLE_*`
- Stripe:
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_*` for all plans and top-ups
  - Optional checkout URL fallbacks

## Supabase Setup

1. Run the migration in `supabase/migrations/20260324093000_auth_billing_usage.sql`.
2. In Supabase Auth provider settings, enable:
   - Google
   - Azure (Microsoft)
   - Facebook
   - Email
3. Add redirect URLs such as:
   - `https://your-domain.com/taskpane.html`
   - `https://localhost:3000/taskpane.html`

## Stripe Setup (Test Mode)

1. Create recurring prices for all six plans (monthly + annual).
2. Create one-time prices for three top-up SKUs.
3. Set all corresponding `STRIPE_PRICE_*` env vars.
4. Configure webhook endpoint:
   - `https://your-domain.com/api/stripe/webhook`
5. Subscribe webhook to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

## Deployment

- Build output: `dist`
- Vercel config: `vercel.json`
- Deploy command (if Vercel CLI is authenticated):

```bash
vercel --prod
```
