import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Entry } from "core";
import { entries, entryConnections } from "./schema";
import type { ConnectionsResult } from "./connections";

export interface StoredEntry extends Entry {
    id: string;
    createdAt: string;
}

const sqlite = new Database("wordfolk.sqlite");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" });

function toStoredEntry(row: typeof entries.$inferSelect): StoredEntry {
    return {
        id: row.id,
        headword: row.headword,
        hint: row.hint,
        createdAt: row.createdAt,
    };
}

export function insertEntry(entry: Entry): StoredEntry {
    const stored: StoredEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };
    db.insert(entries).values(stored).run();
    return stored;
}

export function listEntries(): StoredEntry[] {
    return db.select().from(entries).orderBy(asc(entries.createdAt)).all().map(toStoredEntry);
}

export function getEntry(id: string): StoredEntry | null {
    const row = db.select().from(entries).where(eq(entries.id, id)).get();
    return row ? toStoredEntry(row) : null;
}

export function getConnections(entryId: string): ConnectionsResult | null {
    const entry = db.select().from(entries).where(eq(entries.id, entryId)).get();
    if (!entry || !entry.connectionsGeneratedAt) return null;

    const rows = db.select().from(entryConnections).where(eq(entryConnections.entryId, entryId)).all();
    return {
        meaning: entry.connectionsMeaning ?? "",
        hasConnections: rows.length > 0,
        connections: rows.map((row) => ({ word: row.word, relation: row.relation })),
    };
}

/**
 * Persists a generated connections result. Guarded by connections_generated_at
 * IS NULL so a slower duplicate generation (background job vs. on-demand
 * fallback racing each other) doesn't overwrite/double-insert.
 */
export function saveConnections(entryId: string, result: ConnectionsResult): boolean {
    const updated = db
        .update(entries)
        .set({ connectionsMeaning: result.meaning, connectionsGeneratedAt: new Date().toISOString() })
        .where(and(eq(entries.id, entryId), isNull(entries.connectionsGeneratedAt)))
        .returning({ id: entries.id })
        .all();
    if (updated.length === 0) return false;

    if (result.connections.length > 0) {
        db.insert(entryConnections)
            .values(
                result.connections.map((connection) => ({
                    entryId,
                    word: connection.word,
                    relation: connection.relation,
                    createdAt: new Date().toISOString(),
                }))
            )
            .run();
    }
    return true;
}
