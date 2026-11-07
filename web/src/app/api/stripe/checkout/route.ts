// No session required: consumer purchases are anonymous, resellers also
// buy BEFORE registering. Stripe collects email either way. The webhook
// turns that email into either a license (consumer) or a user + setup
// token (reseller).

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { CONSUMER_PRICING, RESELLER_PRICING, type ConsumerTier, type ResellerTier } from "@/lib/pricing";
import { currentAccountId, accountByIp, getAccount } from "@/lib/account";
import { clientIpFromRequest } from "@/lib/ip";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind");
  const tier = u.searchParams.get("tier");
  const origin = u.origin;

  // Resolve the account the buyer came from (cookie or IP binding) so the
  // webhook can attach the Stripe email + license to the right account row.
  const ip = clientIpFromRequest(req);
  let aid = await currentAccountId();
  if (!aid && ip) aid = (await accountByIp(ip))?.id ?? null;
  // Pre-fill Stripe's email box with whatever the account already has.
  let prefillEmail: string | null = null;
  if (aid) {
    const acc = await getAccount(aid);
    prefillEmail = acc?.recoveryEmail ?? null;
  }

  if (kind === "consumer" && tier && tier in CONSUMER_PRICING) {
    const p = CONSUMER_PRICING[tier as ConsumerTier];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "auto",
      ...(prefillEmail ? { customer_email: prefillEmail } : {}),
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Temporary Spoofer — ${p.name}` },
          unit_amount: p.priceCents,
        },
        quantity: 1,
      }],
      metadata: { kind: "consumer", tier, accountId: aid ?? "" },
      success_url: `${origin}/receipt?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard`,
    });
    return NextResponse.redirect(session.url!, { status: 303 });
  }

  if (kind === "reseller" && tier && tier in RESELLER_PRICING) {
    const p = RESELLER_PRICING[tier as ResellerTier];
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Temporary Spoofer — ${p.name}` },
          unit_amount: p.priceCents,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      metadata: { kind: "reseller", tier },
      success_url: `${origin}/reseller/welcome?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#reseller`,
    });
    return NextResponse.redirect(session.url!, { status: 303 });
  }

  return NextResponse.json({ error: "Invalid checkout parameters" }, { status: 400 });
}
