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

// Per-install identity. Issued on first contact by POST /api/install/register.
// The secret is the HMAC key the loader uses to sign every subsequent request;
// we only store its SHA-256 hash so a DB leak doesn't expose signing keys.
// Revoke by setting revokedAt — any signed request from this install starts
// returning 403 immediately on the next call.
export const installs = pgTable("ts_installs", {
  id:           serial("id").primaryKey(),
  installId:    text("install_id").notNull(),
  secretHash:   text("secret_hash").notNull(),
  firstIp:      text("first_ip"),
  lastIp:       text("last_ip"),
  lastSeenAt:   timestamp("last_seen_at"),
  revokedAt:    timestamp("revoked_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  installIdx: uniqueIndex("ts_installs_id_unique").on(t.installId),
}));

// Account = the persistent identity of a visitor. Every landing visit either
// resolves one via the caller's IP (silent login) or mints a fresh one. The
// master secret is the only credential; losing it = a new account. No email,
// no password, no recovery.
export const accounts = pgTable("ts_accounts", {
  id:          text("id").primaryKey(),              // e.g. ACC_a1b2c3d4
  secretHash:  text("secret_hash").notNull(),        // bcrypt of master code
  // Friendly name the user picks via the pen button. Null => we show id.
  displayName: text("display_name"),
  firstIp:     text("first_ip"),
  lastIp:      text("last_ip"),
  lastSeenAt:  timestamp("last_seen_at"),
  isReseller:  boolean("is_reseller").notNull().default(false),
  brandName:   text("brand_name"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// Which account most recently used this IP. One row per IP; upserted on every
// authenticated request so the gate page can silent-login returning visitors.
export const ipBindings = pgTable("ts_ip_bindings", {
  ip:         text("ip").primaryKey(),
  accountId:  text("account_id").notNull(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

// Nonce replay cache — every signed request carries a client nonce + unix ts.
// We insert on verify; a duplicate violates the unique index and the request
// is refused. Rows self-expire via an occasional cleanup (anything older than
// ~10 minutes is pruned by a probabilistic sweep inside verifySignedRequest).
export const requestNonces = pgTable("ts_request_nonces", {
  id:        serial("id").primaryKey(),
  installId: text("install_id").notNull(),
  nonce:     text("nonce").notNull(),
  seenAt:    timestamp("seen_at").notNull().defaultNow(),
}, (t) => ({
  nonceIdx: uniqueIndex("ts_nonces_unique").on(t.installId, t.nonce),
  ageIdx:   index("ts_nonces_age_idx").on(t.seenAt),
}));

// Rolling window rate-limit counters keyed by (bucket, ip|install). Survives
// Vercel serverless cold starts unlike in-memory counters.
export const rateLimits = pgTable("ts_rate_limits", {
  id:        serial("id").primaryKey(),
  bucket:    text("bucket").notNull(),    // e.g. "auth:ip", "claim:install"
  subject:   text("subject").notNull(),   // ip or installId
  windowEnd: timestamp("window_end").notNull(),
  count:     integer("count").notNull().default(0),
}, (t) => ({
  bucketSubjectIdx: uniqueIndex("ts_rate_limits_unique").on(t.bucket, t.subject),
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
