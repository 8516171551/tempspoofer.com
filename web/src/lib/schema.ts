import { pgTable, serial, text, integer, timestamp, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";

// Users table holds ONLY resellers. Consumers never create accounts —
// their license key IS their identity in the loader. Resellers are
// seeded by the Stripe webhook using the email from checkout, and set
// their password via a one-time setup link.
export const users = pgTable("ts_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),            // NULL until they complete /setup
  isReseller: boolean("is_reseller").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("ts_users_email_unique").on(t.email),
}));

export const resellers = pgTable("ts_resellers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(),
  slug: text("slug").notNull(),
  // Public-facing name shown inside the reseller's rebranded loader. Only
  // honored when the tier's `branding` feature is on. Empty = show the
  // default "Temporary Spoofer" mark.
  brandName: text("brand_name"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("ts_resellers_slug_unique").on(t.slug),
  userIdx: uniqueIndex("ts_resellers_user_unique").on(t.userId),
}));

export const licenses = pgTable("ts_licenses", {
  id: serial("id").primaryKey(),
  licenseKey: text("license_key").notNull(),
  tier: text("tier").notNull(),
  // Consumer purchases set `email` only. Reseller-issued keys set `resellerId`.
  email: text("email"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  resellerId: integer("reseller_id").references(() => resellers.id, { onDelete: "set null" }),
  status: text("status").notNull().default("unused"),
  ip: text("ip"),                                 // IP binding — primary auth for consumer loader
  hwid: text("hwid"),                             // kept for audit; no longer gates activation
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  keyIdx: uniqueIndex("ts_licenses_key_unique").on(t.licenseKey),
  userIdx: index("ts_licenses_user_idx").on(t.userId),
  resellerIdx: index("ts_licenses_reseller_idx").on(t.resellerId),
  emailIdx: index("ts_licenses_email_idx").on(t.email),
  ipIdx: index("ts_licenses_ip_idx").on(t.ip),
}));

export const purchases = pgTable("ts_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  resellerId: integer("reseller_id").references(() => resellers.id, { onDelete: "set null" }),
  email: text("email"),
  stripeSessionId: text("stripe_session_id").notNull(),
  kind: text("kind").notNull(),
  tier: text("tier").notNull(),
  amountCents: integer("amount_cents").notNull(),
  licenseKey: text("license_key"),                // consumer purchases record the issued key
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  sessionIdx: uniqueIndex("ts_purchases_session_unique").on(t.stripeSessionId),
}));

// One-shot setup tokens for first-time reseller password creation.
// Issued by the Stripe webhook, consumed by POST /api/auth/setup.
export const setupTokens = pgTable("ts_setup_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  tokenIdx: uniqueIndex("ts_setup_tokens_token_unique").on(t.token),
}));
