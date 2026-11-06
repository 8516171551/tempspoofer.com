import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { currentSession } from "@/lib/session";
import { CONSUMER_PRICING, RESELLER_PRICING, type ConsumerTier, type ResellerTier } from "@/lib/pricing";

export const runtime = "nodejs";

// Lazy sign-up path for consumer purchases:
// A user who hits /buy without being logged in is bounced to /register first.
// For resellers, /register?reseller=<tier> brings them here with session set.

export async function GET(req: Request) {
  const s = await currentSession();
  if (!s) {
    const url = new URL(req.url);
    url.pathname = "/register";
    return NextResponse.redirect(url);
  }

  const u = new URL(req.url);
  const kind = u.searchParams.get("kind");
  const tier = u.searchParams.get("tier");
  const origin = u.origin;

  if (kind === "consumer" && tier && tier in CONSUMER_PRICING) {
    const p = CONSUMER_PRICING[tier as ConsumerTier];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: s.email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Temporary Spoofer — ${p.name}` },
          unit_amount: p.priceCents,
        },
        quantity: 1,
      }],
      metadata: { uid: String(s.uid), kind: "consumer", tier },
      success_url: `${origin}/dashboard?paid=1`,
      cancel_url: `${origin}/#pricing`,
    });
    return NextResponse.redirect(session.url!, { status: 303 });
  }

  if (kind === "reseller" && tier && tier in RESELLER_PRICING) {
    const p = RESELLER_PRICING[tier as ResellerTier];
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: s.email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Temporary Spoofer — ${p.name}` },
          unit_amount: p.priceCents,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      metadata: { uid: String(s.uid), kind: "reseller", tier },
      success_url: `${origin}/reseller?welcome=1`,
      cancel_url: `${origin}/#reseller`,
    });
    return NextResponse.redirect(session.url!, { status: 303 });
  }

  return NextResponse.json({ error: "Invalid checkout parameters" }, { status: 400 });
}
