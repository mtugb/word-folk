import { describe, expect, test } from "bun:test";
import { createDb } from "./db";

describe("db", () => {
    test("insertEntry stores and generates id/createdAt", () => {
        const db = createDb(":memory:");
        const stored = db.insertEntry({ headword: ["run"], hint: "経営" });

        expect(stored.id).toBeTruthy();
        expect(stored.createdAt).toBeTruthy();
        expect(stored.headword).toEqual(["run"]);
        expect(stored.hint).toBe("経営");
    });

    test("getEntry returns null for a missing id", () => {
        const db = createDb(":memory:");
        expect(db.getEntry("does-not-exist")).toBeNull();
    });

    test("getEntry returns a previously inserted entry", () => {
        const db = createDb(":memory:");
        const stored = db.insertEntry({ headword: ["walk"], hint: "歩く" });

        expect(db.getEntry(stored.id)).toEqual(stored);
    });

    test("listEntries returns entries ordered by createdAt ascending", () => {
        const db = createDb(":memory:");
        const first = db.insertEntry({ headword: ["a"], hint: "" });
        const second = db.insertEntry({ headword: ["b"], hint: "" });

        expect(db.listEntries().map((e) => e.id)).toEqual([first.id, second.id]);
    });

    test("getConnections returns null before anything is generated", () => {
        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["jump"], hint: "跳ぶ" });

        expect(db.getConnections(entry.id)).toBeNull();
    });

    test("saveConnections persists meaning + connections, then getConnections reads them back", () => {
        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });

        const saved = db.saveConnections(entry.id, {
            meaning: "歩くという意味",
            hasConnections: true,
            connections: [
                { word: "stroll", relation: "類義語" },
                { word: "sprint", relation: "対義語" },
            ],
        });

        const expected = {
            meaning: "歩くという意味",
            hasConnections: true,
            connections: [
                { word: "stroll", relation: "類義語", relatedEntryId: null },
                { word: "sprint", relation: "対義語", relatedEntryId: null },
            ],
        };
        expect(saved).toEqual(expected);
        expect(db.getConnections(entry.id)).toEqual(expected);
    });

    test("saveConnections with no connections still marks the entry as generated", () => {
        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["xyz"], hint: "" });

        db.saveConnections(entry.id, { meaning: "", hasConnections: false, connections: [] });

        expect(db.getConnections(entry.id)).toEqual({ meaning: "", hasConnections: false, connections: [] });
    });

    test("saveConnections is a no-op (and doesn't duplicate rows) once already generated", () => {
        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });

        const first = db.saveConnections(entry.id, {
            meaning: "first",
            hasConnections: true,
            connections: [{ word: "stroll", relation: "類義語" }],
        });
        const second = db.saveConnections(entry.id, {
            meaning: "second",
            hasConnections: true,
            connections: [{ word: "hike", relation: "類義語" }],
        });

        expect(first).not.toBeNull();
        expect(second).toBeNull();
        expect(db.getConnections(entry.id)).toEqual({
            meaning: "first",
            hasConnections: true,
            connections: [{ word: "stroll", relation: "類義語", relatedEntryId: null }],
        });
    });

    test("saveConnections links a connection to an existing entry with a matching headword", () => {
        const db = createDb(":memory:");
        const run = db.insertEntry({ headword: ["run"], hint: "経営" });
        const walk = db.insertEntry({ headword: ["walk"], hint: "歩く" });

        db.saveConnections(walk.id, {
            meaning: "歩くという意味",
            hasConnections: true,
            connections: [
                { word: "Run", relation: "対義語" }, // AI表記の大文字小文字ゆれもマッチすること
                { word: "stroll", relation: "類義語" }, // 未登録の語はマッチしない
            ],
        });

        expect(db.getConnections(walk.id)).toEqual({
            meaning: "歩くという意味",
            hasConnections: true,
            connections: [
                { word: "Run", relation: "対義語", relatedEntryId: run.id },
                { word: "stroll", relation: "類義語", relatedEntryId: null },
            ],
        });
    });

    test("saveConnections never links a connection back to the entry being generated for", () => {
        const db = createDb(":memory:");
        const walk = db.insertEntry({ headword: ["walk"], hint: "歩く" });

        db.saveConnections(walk.id, {
            meaning: "歩くという意味",
            hasConnections: true,
            connections: [{ word: "walk", relation: "自分自身" }],
        });

        expect(db.getConnections(walk.id)!.connections[0]!.relatedEntryId).toBeNull();
    });

    test("saveConnections picks the most recently created entry when headwords collide", async () => {
        const db = createDb(":memory:");
        const older = db.insertEntry({ headword: ["test"], hint: "試験" });
        await new Promise((resolve) => setTimeout(resolve, 2));
        const newer = db.insertEntry({ headword: ["test"], hint: "テスト" });
        const other = db.insertEntry({ headword: ["quiz"], hint: "小テスト" });

        db.saveConnections(other.id, {
            meaning: "小テストという意味",
            hasConnections: true,
            connections: [{ word: "test", relation: "類義語" }],
        });

        expect(db.getConnections(other.id)!.connections[0]!.relatedEntryId).toBe(newer.id);
        expect(newer.id).not.toBe(older.id);
    });
});
