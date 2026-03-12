# Rubrix 3-SaaS Word Add-in - Sideload Instructions

## Files Included

- `rubrix3-manifest.xml` - manifest for sideloading into Microsoft Word

## Deployment Information

| Item | URL |
|------|-----|
| Live Add-in URL | https://rubrix-3-saas.vercel.app |
| GitHub Repository | https://github.com/codewizard1000/Rubrix-3-SaaS |

## How to Sideload in Microsoft Word

1. Download `rubrix3-manifest.xml`.
2. Open Microsoft Word (Desktop).
3. Go to Insert -> Get Add-ins -> My Add-ins.
4. Choose Upload My Add-in and select `rubrix3-manifest.xml`.
5. Open the add-in from Home tab -> Rubrix 3-SaaS.

## Notes

- Authentication is required before any tool can be used.
- Supported sign-in options: Microsoft, Google, Email magic link.
- Billing model: 30-day free trial (no card required), then $0.99 monthly or $0.99 yearly.
- Configure Stripe URLs/endpoints and discount codes through environment variables.

## Troubleshooting

- If the task pane is blank, verify the app URL loads directly in your browser.
- If sign-in fails, check Supabase auth provider setup and redirect URL configuration.
- If billing buttons fail, verify Stripe environment variables are set.
