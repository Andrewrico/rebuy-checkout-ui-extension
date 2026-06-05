/**
 * Live smoke test of the checkout recommendation pipeline.
 *
 * Runs the SAME backend modules the checkout route uses, against the real Rebuy
 * datasource and Storefront API, and prints the cards that would render in
 * checkout. Does NOT render the checkout UI — that needs `shopify app dev`.
 *
 * Usage:
 *   node_modules/.bin/vite-node scripts/live-checkout-recs.ts -- [productId ...] [--country=DE]
 */
import { readFileSync } from "node:fs";
import { fetchRebuyDatasource } from "../app/rebuy/client";
import { normalize } from "../app/rebuy/normalize";
import { validateVariants } from "../app/rebuy/validateVariants";

// Load .env into process.env (the modules read credentials from there).
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const rawArgs = process.argv.slice(2);
const countryArg = rawArgs.find((a) => a.startsWith("--country="));
const country = countryArg?.split("=")[1];
const productIds = rawArgs
  .filter((a) => !a.startsWith("--"))
  .map(Number)
  .filter(Number.isFinite);

async function main() {
  console.log("Store:     ", process.env.STOREFRONT_DOMAIN);
  console.log("Datasource:", process.env.REBUY_DATASOURCE_ID);
  console.log("Seed IDs:  ", productIds.length ? productIds.join(", ") : "(none)");
  console.log("Country:   ", country ?? "(none — base currency)");
  console.log("─".repeat(60));

  const raw = await fetchRebuyDatasource(productIds, country);
  console.log(`Rebuy returned ${raw.length} product(s)`);

  const inCart = new Set(productIds);
  const cards = normalize(raw).filter((c) => !inCart.has(c.productId));
  console.log(`After normalize + in-cart filter: ${cards.length} card(s)`);

  const validated = await validateVariants(cards, country);
  console.log(`After Storefront validation: ${validated.length} card(s)\n`);

  for (const c of validated) {
    console.log(
      `• ${c.title}\n    ${c.price} ${c.currencyCode}  |  ${c.variantGid}`,
    );
  }
  if (!validated.length) {
    console.log("(no cards would render — empty section)");
  }
}

main().catch((err) => {
  console.error("LIVE TEST FAILED:", err);
  process.exit(1);
});
