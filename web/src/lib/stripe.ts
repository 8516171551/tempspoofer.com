import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) console.warn("[ts] STRIPE_SECRET_KEY is not set");

export const stripe = new Stripe(key ?? "sk_test_placeholder", {
  apiVersion: "2025-10-29.clover" as Stripe.LatestApiVersion,
});
