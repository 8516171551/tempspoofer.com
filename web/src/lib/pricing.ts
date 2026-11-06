// All prices in USD cents. Keep in one place so the landing page, the
// Stripe checkout route and the Stripe product sync script agree.

export type ConsumerTier = "day" | "week" | "month";
export type ResellerTier = "starter" | "pro" | "enterprise";

export const CONSUMER_PRICING: Record<ConsumerTier, {
  name: string;
  priceCents: number;
  blurb: string;
  durationHours: number;
}> = {
  day:   { name: "Day Pass",   priceCents:  499, blurb: "24 hour spoof",  durationHours:  24 },
  week:  { name: "Week Pass",  priceCents: 1499, blurb: "7 day spoof",    durationHours: 168 },
  month: { name: "Month Pass", priceCents: 3999, blurb: "30 day spoof",   durationHours: 720 },
};

export const RESELLER_PRICING: Record<ResellerTier, {
  name: string;
  priceCents: number;
  highlight: boolean;
  features: {
    infiniteKeys: boolean;
    discountCoupon: number;  // percent; 0 if no coupon tier
    prioritySupport: boolean;
    panelAccess: boolean;
    branding: boolean;
    discordBot: boolean;
    resellerHosting: boolean;
  };
}> = {
  starter: {
    name: "Starter Package",
    priceCents: 4999,
    highlight: false,
    features: {
      infiniteKeys:    false,
      discountCoupon:  70,
      prioritySupport: true,
      panelAccess:     false,
      branding:        false,
      discordBot:      false,
      resellerHosting: false,
    },
  },
  pro: {
    name: "Pro Package",
    priceCents: 89900,
    highlight: true,
    features: {
      infiniteKeys:    true,
      discountCoupon:  0,
      prioritySupport: true,
      panelAccess:     true,
      branding:        true,
      discordBot:      true,
      resellerHosting: true,
    },
  },
  enterprise: {
    name: "Enterprise Package",
    priceCents: 49900,
    highlight: false,
    features: {
      infiniteKeys:    true,
      discountCoupon:  0,
      prioritySupport: true,
      panelAccess:     true,
      branding:        false,
      discordBot:      false,
      resellerHosting: false,
    },
  },
};

export function fmtUsd(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}
