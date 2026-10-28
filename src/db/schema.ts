import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ROLES = ["worker", "planner", "payroll", "admin"] as const;
export type Role = (typeof ROLES)[number];

// ---------------------------------------------------------------------------
// Users and Better Auth tables (user, session, account, verification).
// The extra user columns (roles, phone, …) are managed by the app, not by
// Better Auth. No sensitive personal data is stored – see docs/beslut.md.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  roles: text("roles").array().$type<Role[]>().notNull().default(sql`'{worker}'::text[]`),
  phone: text("phone"),
  fortnoxEmployeeId: text("fortnox_employee_id"),
  active: boolean("active").notNull().default(true),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

export const shiftTemplates = pgTable("shift_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  lunchMinutes: integer("lunch_minutes").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const shifts = pgTable(
  "shifts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    date: date("date", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    lunchMinutes: integer("lunch_minutes").notNull().default(0),
    // "trust" = förtroendetid, see lib/time.ts
    type: text("type").$type<"regular" | "trust">().notNull().default("regular"),
    status: text("status").$type<"planned" | "sick">().notNull().default("planned"),
    templateId: text("template_id").references(() => shiftTemplates.id, { onDelete: "set null" }),
    replacesShiftId: text("replaces_shift_id").references((): AnyPgColumn => shifts.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdBy: text("created_by").references(() => user.id),
    updatedBy: text("updated_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("shifts_date_idx").on(t.date),
    index("shifts_user_date_idx").on(t.userId, t.date),
    check("shifts_end_after_start", sql`${t.endTime} > ${t.startTime}`),
    check("shifts_lunch_non_negative", sql`${t.lunchMinutes} >= 0`),
    check("shifts_type_valid", sql`${t.type} in ('regular', 'trust')`),
    check("shifts_status_valid", sql`${t.status} in ('planned', 'sick')`),
  ],
);

/**
 * One row per month that has been approved at least once. A month is locked
 * when status = 'approved'. Payroll can unlock it, which sets status
 * 'unlocked' with a comment. Full history is kept in audit_log.
 */
export const monthApprovals = pgTable(
  "month_approvals",
  {
    month: date("month", { mode: "string" }).primaryKey(), // first day of month
    status: text("status").$type<"approved" | "unlocked">().notNull(),
    approvedBy: text("approved_by").references(() => user.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    unlockedBy: text("unlocked_by").references(() => user.id),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    unlockComment: text("unlock_comment"),
  },
  (t) => [check("month_approvals_status_valid", sql`${t.status} in ('approved', 'unlocked')`)],
);

export const holidays = pgTable("holidays", {
  date: date("date", { mode: "string" }).primaryKey(),
  name: text("name").notNull(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    userId: text("user_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)],
);

export type User = typeof user.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;
