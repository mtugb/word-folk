import { Database } from "bun:sqlite";
import type { Entry } from "core";

export interface StoredEntry extends Entry {
    id: string;
    createdAt: string;
}

interface EntryRow {
    id: string;
    headword: string;
    hint: string;
    created_at: string;
}

const db = new Database("wordfolk.sqlite");

db.run(`
    CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        headword TEXT NOT NULL,
        hint TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
`);

function rowToEntry(row: EntryRow): StoredEntry {
    return {
        id: row.id,
        headword: JSON.parse(row.headword),
        hint: row.hint,
        createdAt: row.created_at,
    };
}

export function insertEntry(entry: Entry): StoredEntry {
    const stored: StoredEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };
    db.run(
        "INSERT INTO entries (id, headword, hint, created_at) VALUES (?, ?, ?, ?)",
        [stored.id, JSON.stringify(stored.headword), stored.hint, stored.createdAt]
    );
    return stored;
}

export function listEntries(): StoredEntry[] {
    const rows = db.query("SELECT * FROM entries ORDER BY created_at ASC").all() as EntryRow[];
    return rows.map(rowToEntry);
}

export function getEntry(id: string): StoredEntry | null {
    const row = db.query("SELECT * FROM entries WHERE id = ?").get(id) as EntryRow | null;
    return row ? rowToEntry(row) : null;
}
