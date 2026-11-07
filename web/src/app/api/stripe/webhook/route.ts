// Handles the two checkout flows:
//   consumer → issue a fresh license key, email it, record purchase.
//   reseller → create (or reuse) the user keyed by Stripe email, create
//              the reseller row, issue a one-shot setup token, email it.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { newLicenseKey } from "@/lib/keys";
import { CONSUMER_PRICING } from "@/lib/pricing";
import { sendLicenseEmail, sendResellerSetupEmail } from "@/lib/email";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

function tierLabel(tier: string): string {
  const p = CONSUMER_PRICING[tier as keyof typeof CONSUMER_PRICING];
  return p?.name ?? tier;
}

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
    const kind = session.metadata?.kind;
    const tier = session.metadata?.tier;
    const email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase();

    if (!kind || !tier || !email) {
      return NextResponse.json({ ok: true, skipped: "missing metadata/email" });
    }

    const exists = await db.select().from(schema.purchases).where(eq(schema.purchases.stripeSessionId, session.id)).limit(1);
    if (exists.length > 0) {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    if (kind === "consumer" && tier in CONSUMER_PRICING) {
      const licenseKey = newLicenseKey();
      const accountId = (session.metadata?.accountId ?? "").trim() || null;

      // Attach the Stripe email to the buyer's account as the recovery
      // address. Only set it if the account doesn't already have one so
      // we never clobber a deliberate user choice.
      if (accountId) {
        try {
          const acc = (await db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId)).limit(1))[0];
          if (acc && !acc.recoveryEmail) {
            await db.update(schema.accounts)
              .set({ recoveryEmail: email })
              .where(eq(schema.accounts.id, accountId));
          }
        } catch (e) {
          console.error("[ts.webhook] recovery email attach failed", e);
        }
      }

      await db.insert(schema.licenses).values({
        licenseKey,
        tier,
        email,
        status: "unused",
      });

      await db.insert(schema.purchases).values({
        email,
        stripeSessionId: session.id,
        kind: "consumer",
        tier,
        amountCents: session.amount_total ?? 0,
        licenseKey,
      });

      await sendLicenseEmail(email, licenseKey, tierLabel(tier));
      return NextResponse.json({ ok: true, delivered: "consumer", attachedToAccount: accountId });
    }

    if (kind === "reseller") {
      let user = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
      if (!user) {
        user = (await db.insert(schema.users).values({ email, isReseller: true }).returning())[0];
      } else {
        await db.update(schema.users).set({ isReseller: true }).where(eq(schema.users.id, user.id));
        user.isReseller = true;
      }

      const existingReseller = (await db.select().from(schema.resellers).where(eq(schema.resellers.userId, user.id)).limit(1))[0];
      if (!existingReseller) {
        const slug = `r${user.id}-${randomToken(4)}`;
        await db.insert(schema.resellers).values({
          userId: user.id,
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
        }).where(eq(schema.resellers.userId, user.id));
      }

      await db.insert(schema.purchases).values({
        userId: user.id,
        email,
        stripeSessionId: session.id,
        kind: "reseller",
        tier,
        amountCents: session.amount_total ?? 0,
      });

      // Only issue a setup token if they have no password yet. Returning
      // resellers who just resubscribed already know how to log in.
      if (!user.passwordHash) {
        const token = randomToken(24);
        const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);
        await db.insert(schema.setupTokens).values({
          token,
          userId: user.id,
          expiresAt,
        });
        const origin = new URL(req.url).origin;
        await sendResellerSetupEmail(email, `${origin}/setup?token=${token}`, tier);
      }

      return NextResponse.json({ ok: true, delivered: "reseller" });
    }
  }

  if (evt.type === "customer.subscription.deleted") {
    const sub = evt.data.object as Stripe.Subscription;
    await db.update(schema.resellers)
      .set({ status: "cancelled" })
      .where(eq(schema.resellers.stripeSubscriptionId, sub.id));
  }

  return NextResponse.json({ ok: true });
}
