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

export interface PersistedConnection {
    word: string;
    relation: string;
    relatedEntryId: string | null;
}

export interface PersistedConnectionsResult {
    meaning: string;
    hasConnections: boolean;
    connections: PersistedConnection[];
}

// import.meta.dir-relative, so migrations resolve correctly regardless of
// the process's cwd (e.g. bun test invoked from the repo root).
const MIGRATIONS_FOLDER = `${import.meta.dir}/../drizzle`;

export function createDb(sqlitePath: string) {
    const sqlite = new Database(sqlitePath);
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    function toStoredEntry(row: typeof entries.$inferSelect): StoredEntry {
        return {
            id: row.id,
            headword: row.headword,
            hint: row.hint,
            createdAt: row.createdAt,
        };
    }

    function insertEntry(entry: Entry): StoredEntry {
        const stored: StoredEntry = {
            ...entry,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
        db.insert(entries).values(stored).run();
        return stored;
    }

    function listEntries(): StoredEntry[] {
        return db.select().from(entries).orderBy(asc(entries.createdAt)).all().map(toStoredEntry);
    }

    function getEntry(id: string): StoredEntry | null {
        const row = db.select().from(entries).where(eq(entries.id, id)).get();
        return row ? toStoredEntry(row) : null;
    }

    /**
     * Finds an existing entry whose headword matches the given free-text word
     * (case-insensitive, exact match on the space-joined headword — the same
     * form the AI is given and returns). Never matches excludeEntryId itself.
     * When several entries share the headword (e.g. multiple senses of the
     * same word), the most recently created one wins.
     */
    function findEntryIdByHeadword(word: string, excludeEntryId: string): string | null {
        const normalized = word.trim().toLowerCase();
        const rows = db.select({ id: entries.id, headword: entries.headword, createdAt: entries.createdAt }).from(entries).all();
        const matches = rows.filter(
            (row) => row.id !== excludeEntryId && row.headword.join(" ").trim().toLowerCase() === normalized
        );
        if (matches.length === 0) return null;
        matches.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return matches[0]!.id;
    }

    function getConnections(entryId: string): PersistedConnectionsResult | null {
        const entry = db.select().from(entries).where(eq(entries.id, entryId)).get();
        if (!entry || !entry.connectionsGeneratedAt) return null;

        const rows = db.select().from(entryConnections).where(eq(entryConnections.entryId, entryId)).all();
        return {
            meaning: entry.connectionsMeaning ?? "",
            hasConnections: rows.length > 0,
            connections: rows.map((row) => ({
                word: row.word,
                relation: row.relation,
                relatedEntryId: row.relatedEntryId,
            })),
        };
    }

    /**
     * Persists a generated connections result, resolving each connection's
     * word against already-registered entries' headwords. Guarded by
     * connections_generated_at IS NULL so a slower duplicate generation
     * (background job vs. on-demand fallback racing each other) doesn't
     * overwrite/double-insert; returns null when that guard loses the race.
     */
    function saveConnections(entryId: string, result: ConnectionsResult): PersistedConnectionsResult | null {
        const updated = db
            .update(entries)
            .set({ connectionsMeaning: result.meaning, connectionsGeneratedAt: new Date().toISOString() })
            .where(and(eq(entries.id, entryId), isNull(entries.connectionsGeneratedAt)))
            .returning({ id: entries.id })
            .all();
        if (updated.length === 0) return null;

        const connections: PersistedConnection[] = result.connections.map((connection) => ({
            word: connection.word,
            relation: connection.relation,
            relatedEntryId: findEntryIdByHeadword(connection.word, entryId),
        }));

        if (connections.length > 0) {
            db.insert(entryConnections)
                .values(
                    connections.map((connection) => ({
                        entryId,
                        word: connection.word,
                        relation: connection.relation,
                        relatedEntryId: connection.relatedEntryId,
                        createdAt: new Date().toISOString(),
                    }))
                )
                .run();
        }

        return { meaning: result.meaning, hasConnections: connections.length > 0, connections };
    }

    return { insertEntry, listEntries, getEntry, getConnections, saveConnections };
}

export type Db = ReturnType<typeof createDb>;
