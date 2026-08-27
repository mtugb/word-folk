import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable("entries", {
    id: text("id").primaryKey(),
    headword: text("headword", { mode: "json" }).$type<string[]>().notNull(),
    hint: text("hint").notNull(),
    createdAt: text("created_at").notNull(),
    connectionsMeaning: text("connections_meaning"),
    connectionsGeneratedAt: text("connections_generated_at"),
});

export const entryConnections = sqliteTable("entry_connections", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryId: text("entry_id")
        .notNull()
        .references(() => entries.id),
    word: text("word").notNull(),
    relation: text("relation").notNull(),
    // 将来、既存エントリーとの関連付け機能で埋める。今は常にnull。
    relatedEntryId: text("related_entry_id").references(() => entries.id),
    createdAt: text("created_at").notNull(),
});
