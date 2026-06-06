# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-contained Shopify app with two parts that ship together:

- **Checkout UI extension** (`extensions/rebuy-checkout-recs/`) — renders Rebuy
  recommendations in checkout. Target: `purchase.checkout.block.render` (a static
  block — a merchant must place it via the checkout editor; it doesn't auto-render).
  Runs client-side in the checkout sandbox; **cannot hold secrets**.
- **Remix backend proxy** (`app/`) — holds the Rebuy API key + Storefront token,
  calls Rebuy, filters in-cart products, validates variants, returns normalized cards.

Read `.claude/MEMORY.md` before changing how the extension talks to the backend
or before deploying — it documents the full runtime dependency chain and key files.

## Commands

Use **npm** (the repo has `package-lock.json`). CI installs with yarn — that's a
known quirk; don't switch local commands to yarn.

- `npm run dev` — `shopify app dev` (starts a tunnel + the Remix app)
- `npm run build` — `remix vite:build`
- `npm run lint` — ESLint (config: `.eslintrc.cjs`)
- `npm run setup` — `prisma generate && prisma migrate deploy` (Prisma is for
  Shopify session storage only — no application data)
- `npm run deploy` — `shopify app deploy`

Requires Node `>=20.19 <22 || >=22.12`. TypeScript is `strict`. There is no
`typecheck` script — use `npx tsc --noEmit`. Tests run with Vitest via
`npm test` (`vitest run`); backend unit tests live in `app/rebuy/*.test.ts`.

## Critical rules

- **Secrets stay server-side.** `REBUY_API_KEY` and `STOREFRONT_TOKEN` live only
  in the Remix backend (`app/rebuy/`). Never reference them from
  `extensions/`, which only POSTs to the proxy. See `.env.example`.
- **`app/routes/api.rebuy.checkout-upsells.tsx` is runtime-critical** — the proxy
  the extension fetches on every checkout render. The embedded admin UI / OAuth
  routes are not needed for upsells to work.
- **Dev backend URL** lives in `extensions/rebuy-checkout-recs/src/config.ts`
  (`BACKEND_URL`). It points at an ephemeral Cloudflare/ngrok tunnel that rotates
  and dies. Update it when the tunnel changes — or use `/update-backend-url`. The
  `backend_url` extension setting (in `shopify.extension.toml`) overrides the
  constant when set.

## Shopify work

Prefer the bundled Shopify skills over guessing APIs: `shopify-use-shopify-cli`
(validate `*.toml`, run CLI), `shopify-polaris-checkout-extensions` (extension UI),
`shopify-storefront-graphql` (Storefront API). The `shopify-checkout-recs-extension`
skill covers building this kind of extension from scratch.
