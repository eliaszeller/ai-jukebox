import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tracks = sqliteTable("tracks", {
  id: text("id").notNull(),
  userId: text("user_id").notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.id] })]);

export const settings = sqliteTable("settings", {
  userId: text("user_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.key] })]);
