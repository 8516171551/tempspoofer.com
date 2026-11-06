import { pgTable, serial, text, integer, timestamp, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";

export const users = pgTable("ts_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  isReseller: boolean("is_reseller").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("ts_users_email_unique").on(t.email),
}));

export const resellers = pgTable("ts_resellers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(),               // starter | pro | enterprise
  slug: text("slug").notNull(),               // marketing handle
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
  tier: text("tier").notNull(),               // day | week | month
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  resellerId: integer("reseller_id").references(() => resellers.id, { onDelete: "set null" }),
  status: text("status").notNull().default("unused"),   // unused | active | expired
  hwid: text("hwid"),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  keyIdx: uniqueIndex("ts_licenses_key_unique").on(t.licenseKey),
  userIdx: index("ts_licenses_user_idx").on(t.userId),
  resellerIdx: index("ts_licenses_reseller_idx").on(t.resellerId),
}));

export const purchases = pgTable("ts_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  resellerId: integer("reseller_id").references(() => resellers.id, { onDelete: "set null" }),
  stripeSessionId: text("stripe_session_id").notNull(),
  kind: text("kind").notNull(),               // consumer | reseller
  tier: text("tier").notNull(),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  sessionIdx: uniqueIndex("ts_purchases_session_unique").on(t.stripeSessionId),
}));
