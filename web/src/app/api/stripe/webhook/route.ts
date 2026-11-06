import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { newLicenseKey } from "@/lib/keys";
import { CONSUMER_PRICING, type ConsumerTier } from "@/lib/pricing";


const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  if (!WEBHOOK_SECRET || !sig) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let evt: Stripe.Event;
  try {
    evt = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bad signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (evt.type === "checkout.session.completed") {
    const session = evt.data.object as Stripe.Checkout.Session;
    const uid = Number(session.metadata?.uid ?? 0);
    const kind = session.metadata?.kind;
    const tier = session.metadata?.tier;
    if (!uid || !kind || !tier) return NextResponse.json({ ok: true });

    const exists = await db.select().from(schema.purchases).where(eq(schema.purchases.stripeSessionId, session.id)).limit(1);
    if (exists.length > 0) return NextResponse.json({ ok: true });

    await db.insert(schema.purchases).values({
      userId: uid,
      stripeSessionId: session.id,
      kind,
      tier,
      amountCents: session.amount_total ?? 0,
    });

    if (kind === "consumer" && tier in CONSUMER_PRICING) {
      await db.insert(schema.licenses).values({
        licenseKey: newLicenseKey(),
        tier,
        userId: uid,
        status: "unused",
      });
    }

    if (kind === "reseller") {
      await db.update(schema.users).set({ isReseller: true }).where(eq(schema.users.id, uid));
      const existingReseller = await db.select().from(schema.resellers).where(eq(schema.resellers.userId, uid)).limit(1);
      if (existingReseller.length === 0) {
        const slug = `r${uid}-${Math.random().toString(36).slice(2, 8)}`;
        await db.insert(schema.resellers).values({
          userId: uid,
          tier,
          slug,
          stripeSubscriptionId: session.subscription?.toString() ?? null,
          status: "active",
        });
      } else {
        await db.update(schema.resellers).set({
          tier,
          stripeSubscriptionId: session.subscription?.toString() ?? null,
          status: "active",
        }).where(eq(schema.resellers.userId, uid));
      }
    }
  }

  if (evt.type === "customer.subscription.deleted") {
    const sub = evt.data.object as Stripe.Subscription;
    await db.update(schema.resellers).set({ status: "cancelled" }).where(eq(schema.resellers.stripeSubscriptionId, sub.id));
  }

  // Unused param hint for TS when ConsumerTier isn't imported elsewhere
  void (0 as unknown as ConsumerTier | undefined);

  return NextResponse.json({ ok: true });
}
