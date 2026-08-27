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

        const ok = db.saveConnections(entry.id, {
            meaning: "歩くという意味",
            hasConnections: true,
            connections: [
                { word: "stroll", relation: "類義語" },
                { word: "run", relation: "対義語" },
            ],
        });

        expect(ok).toBe(true);
        expect(db.getConnections(entry.id)).toEqual({
            meaning: "歩くという意味",
            hasConnections: true,
            connections: [
                { word: "stroll", relation: "類義語" },
                { word: "run", relation: "対義語" },
            ],
        });
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

        expect(first).toBe(true);
        expect(second).toBe(false);
        expect(db.getConnections(entry.id)).toEqual({
            meaning: "first",
            hasConnections: true,
            connections: [{ word: "stroll", relation: "類義語" }],
        });
    });
});
