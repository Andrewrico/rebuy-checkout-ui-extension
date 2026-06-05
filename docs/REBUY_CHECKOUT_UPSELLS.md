# Rebuy Checkout Upsells

A Shopify **Checkout UI Extension** that renders Rebuy-powered upsell cards inside
checkout, fed by a **backend proxy route** so the Rebuy API key never reaches the
browser. Built for `andrewrico-demo.myshopify.com`, Rebuy datasource **`300871`**.

No Rebuy widgets, no Liquid, no theme JS.

## Data flow

```
Checkout UI Extension (React, network_access=true)
  → POST  <backend>/api/rebuy/checkout-upsells
      → Rebuy datasource 300871  (server-side, REBUY_API_KEY)
      → normalize products
      → validate variant GIDs via Storefront API (availableForSale)
  ← [{ title, image, price, currencyCode, variantGid }]
  → render cards → applyCartLinesChange(addCartLine, variantGid)
```

## Files

| File | Role |
|------|------|
| `app/routes/api.rebuy.checkout-upsells.tsx` | Proxy route: CORS, POST, orchestration |
| `app/rebuy/client.ts` | Server-side call to Rebuy datasource 300871 |
| `app/rebuy/normalize.ts` | Rebuy product → card model + variant GID |
| `app/rebuy/validateVariants.ts` | Storefront API check that variants exist & are buyable |
| `extensions/rebuy-checkout-recs/shopify.extension.toml` | Target + `network_access` + settings |
| `extensions/rebuy-checkout-recs/src/Checkout.tsx` | Entry: read lines → fetch → render → add |
| `extensions/rebuy-checkout-recs/src/useUpsells.ts` | Fetch + state machine |
| `extensions/rebuy-checkout-recs/src/RecommendationCard.tsx` | Card + guarded Add button |
| `extensions/rebuy-checkout-recs/src/config.ts` | `BACKEND_URL` constant |

## Environment variables

Copy `.env.example` → `.env` and fill in:

| Var | Purpose |
|-----|---------|
| `REBUY_API_KEY` | **Server-side** Rebuy key. Required. |
| `REBUY_DATASOURCE_ID` | `300871`. |
| `REBUY_LIMIT` | Recs requested before filtering (default 8). |
| `SHOP_CURRENCY` | Currency stamped on cards (default USD). |
| `STOREFRONT_DOMAIN` | `andrewrico-demo.myshopify.com`. |
| `STOREFRONT_TOKEN` | Storefront API access token (Admin → Settings → Apps and sales channels → Develop apps → Storefront API). |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` / `SCOPES` / `SHOPIFY_APP_URL` | Filled by the CLI on `shopify app dev`. |

> If `STOREFRONT_DOMAIN`/`STOREFRONT_TOKEN` are missing, validation is skipped (the
> datasource is already store-scoped) and a warning is logged — set them for the real check.

## Local dev

```bash
npm install                       # installs app + extension workspace deps

# 1. Run the app (links/creates the Shopify app on first run — browser login).
npm run dev                       # = shopify app dev   (note the local port, usually 3000)

# 2. In a second terminal, expose the local app:
ngrok http 3000                   # copy the https://<random>.ngrok-free.app URL

# 3. Point the extension at the tunnel — ONE of:
#    a) edit extensions/rebuy-checkout-recs/src/config.ts → BACKEND_URL
#       = https://<ngrok>.ngrok-free.app/api/rebuy/checkout-upsells
#    b) OR set the "Upsells backend URL" extension setting in the checkout editor.
```

Then open the dev-store checkout preview from `shopify app dev`, and in the checkout
editor drop the **Rebuy Checkout Recommendations** block into the order summary.

> **ngrok free URLs rotate on every restart** — re-paste the URL into `config.ts` (or the
> setting) each session, or use a reserved ngrok domain.

## Test matrix

1. **Empty cart** → section renders nothing (or default recs), no errors.
2. **One item** → its product id is in the POST body; the in-cart product is absent from cards.
3. **Multiple items** → all ids sent; results deduped and capped to `max_cards`.
4. **Variant validity** → every card's `variantGid` resolves on this store and is `availableForSale`.
5. **Add button** → adds the line; order summary updates; the card disappears next render.
6. **Accelerated checkout** (Shop/Apple Pay) → Add is hidden or shows the error banner; no crash.
7. **CORS** → preflight `204` + POST `200` with `Access-Control-Allow-Origin: *`.
8. **Bundle** → `shopify app build`; extension bundle < 64 KB.

Quick backend sanity check (no checkout needed):

```bash
curl -s -X POST https://<ngrok>.ngrok-free.app/api/rebuy/checkout-upsells \
  -H 'Content-Type: application/json' \
  -d '{"productIds":[],"maxCards":4}' | jq
```

## Production notes

- Replace `BACKEND_URL` with a **real hosted backend origin** (deploy the Remix app);
  ngrok is dev-only.
- Checkout-step placement requires **Shopify Plus** on the live store (the Partner dev
  store has it enabled for previews).
- Keep the extension bundle minimal (no Rebuy SDK, no carousel libs) to stay under 64 KB.
- Price formatting uses the checkout's currency via `i18n.formatCurrency`; for a single
  store/currency this is correct. Multi-currency would need currency-aware formatting.

## Risks / open items

- **Datasource 300871 scope** — must be configured in Rebuy admin to return this store's
  products and accept `shopify_product_ids` seeding. Verify with the `curl` above.
- **Storefront token** — required for real variant validation; without it the proxy trusts
  the datasource.
