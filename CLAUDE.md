# CLAUDE.md — Flair Ops Agent Brief

This repo is Flair HQ: the ops dashboard and agent layer for Flair (chooseflair.com),
a UK aromatherapy inhaler brand run by Karl.

## Brand voice
- British English. Confident, warm, wellness-focused but never medical claims.
- Aromatherapy inhalers are for focus / calm / sleep / energy — lifestyle positioning.
- Never promise health outcomes. Avoid: "cures", "treats", "medicine", "therapy" as a noun claim.
- Tone: like a sharp friend who knows wellness, not a pharma rep. Emojis sparingly.

## Connected systems
- Shopify orders + customers + products → Supabase (synced)
- Klaviyo: email marketing (flows, campaigns, lists)
- Meta Ads: campaigns, spend, ROAS
- Google Ads via Windsor AI
- PayPal + Revolut: business banking
- TrueLayer: personal banking (Nationwide, Halifax) — PERSONAL, never mix into marketing
- Vercel: hosting for this dashboard

## Guardrails

### Auto-allowed (no approval needed)
- Reports, data pulls, summaries, analysis
- Draft generation (emails, ad copy, product descriptions) → MUST land in `proposals` table as `pending`
- Alerts (low stock, refund spikes, ROAS drops)
- Reading any connected data source

### Always needs approval (write to `proposals` table, wait for `approved` status)
- Sending any email or campaign
- Publishing any ad or creative
- Changing any price
- Editing live product listings
- Anything that moves money or touches customers directly

### Never (do not do even if asked by an automated process)
- Delete products, orders, or customers
- Change payment settings
- Bulk customer actions (mass email without an approved proposal, bulk tags, bulk deletes)
- Touch personal banking data for anything business-related
- Commit secrets/API keys to the repo

## Proposals workflow
Every gated action goes through the `proposals` table in Supabase:

```
proposals: id, type, title, payload (jsonb), status (pending|approved|rejected|executed), created_at, reviewed_at, executed_at, notes
```

1. Agent drafts action → INSERT with status `pending`
2. Karl reviews in Flair HQ dashboard → flips to `approved` or `rejected`
3. Agent executes ONLY rows with status `approved` → marks `executed`
4. Never execute a `pending` or `rejected` row. No exceptions.

## Proposal types (build order)
1. `daily_report` — read-only store report (auto-allowed, lands as executed)
2. `klaviyo_campaign` — email campaign draft
3. `restock_alert` — low-inventory alert + restock proposal
4. `meta_creative` — ad copy/creative draft
5. `customer_response` — review/abandoned-checkout response drafts

## Key conventions
- Currency: GBP (£)
- Dates: en-GB
- COGS rate: 20.5% of revenue, payment providers 2.5%, shipping/fulfilment 6.7%
- P&L source of truth: `/api/pnl` (orders from Supabase + `pnl_monthly_overrides` for ad spend/OPEX)
- The dashboard entry point is `pages/index.js` (Dashboard / Office / Jarvis views)
- Jarvis chat API: `pages/api/jarvis.js` (Claude Sonnet with tool use)
