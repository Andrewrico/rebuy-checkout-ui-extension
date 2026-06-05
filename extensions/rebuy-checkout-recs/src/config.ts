// Backend proxy URL the checkout extension calls for recommendations.
//
// DEV:  paste the current ngrok URL here, OR set the `backend_url` extension
//       setting in the checkout editor (the setting wins over this constant).
// PROD: replace with the real hosted backend origin.
//
// This is the single place to update when the ngrok URL rotates.
export const BACKEND_URL =
  "https://hats-blink-essay-consecutive.trycloudflare.com/api/rebuy/checkout-upsells";

export const DEFAULT_HEADING = "You might also like";
export const DEFAULT_MAX_CARDS = 4;
