# Rubrix 3-SaaS

Rubrix 3-SaaS is a Microsoft Word add-in for educators with AI-assisted feedback workflows:

- AI Comments
- AI Grade Paper (with saved rubrics + grading controls)
- AI Detector (Winston AI-content detection with highlighted passages)
- Plagiarism Detector (Winston source matching)

## Product Changes Included

- Removed the legacy `Reference Check citations` feature and related code.
- Added authenticated access gate (Supabase auth required before use).
- Added top-right account menu and billing/settings dialog.
- Added Stripe billing scaffolding:
  - 30-day free trial, no card required to sign up
  - $0.99 monthly or $0.99 yearly auto-renew plan options
  - discount/free membership code input
- Renamed UI/product identity to `Rubrix 3-SaaS`.

## Tech Stack

- Office Add-in (Word task pane)
- React + Material UI
- Gemini API (`@google/genai`) for grading/comments
- Winston API (via Vercel serverless routes) for AI detection/plagiarism
- Supabase Auth (REST integration)
- Stripe checkout integration scaffold (env-driven)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and configure:

```bash
cp .env.example .env
```

3. Start dev server:

```bash
npm run dev-server
```

4. Build for production:

```bash
npm run build
```

## Environment Variables

Create `.env` with:

| Variable | Required | Description |
|---|---|---|
| `API_KEY` | Yes | Gemini API key for AI comments and AI Grade Paper |
| `WINSTON_API_KEY` | Yes | Winston API key used by `/api/winston/ai-content-detection` and `/api/winston/plagiarism` |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable (anon) key |
| `SUPABASE_AUTH_REDIRECT_URL` | Recommended | OAuth/magic-link redirect URL (usually your deployed `taskpane.html`) |
| `STRIPE_CHECKOUT_ENDPOINT` | Optional | Backend endpoint to create Stripe Checkout sessions |
| `STRIPE_MONTHLY_CHECKOUT_URL` | Optional | Direct monthly checkout URL fallback |
| `STRIPE_YEARLY_CHECKOUT_URL` | Optional | Direct yearly checkout URL fallback |
| `FREE_MEMBERSHIP_CODES` | Optional | Comma-separated free membership codes |

## Supabase Auth Configuration

Configured defaults:

- URL: `https://zlgrzxvwyilvcnzocrrk.supabase.co`
- Publishable key: `sb_publishable_-x3VIM-IJWU3VN-PE1hN9Q_rFZUeKMz`

Enable these providers in Supabase Auth settings:

- Google
- Azure (Microsoft)
- Email

Set redirect URL(s) to your add-in task pane URL, e.g.:

- `https://rubrix-3-saas.vercel.app/taskpane.html`
- `https://localhost:3000/taskpane.html` (for local dev)

## Stripe Billing Scaffold

The billing UI supports:

- trial state tracking
- monthly/yearly checkout triggers
- free code redemption

For production, wire one of:

1. `STRIPE_CHECKOUT_ENDPOINT` (recommended backend flow)
2. `STRIPE_MONTHLY_CHECKOUT_URL` + `STRIPE_YEARLY_CHECKOUT_URL` (direct URL fallback)

## Word Sideload

Use `rubrix3-manifest.xml` and follow [SIDELOAD-README.md](./SIDELOAD-README.md).

## Deployment

The project includes `vercel.json` and production URLs configured for:

- `https://rubrix-3-saas.vercel.app`

After deployment, ensure manifest URLs and Supabase redirect URLs match your live domain.
