import { describe, expect, mock, test } from "bun:test";
import type { ConnectionsResult } from "./connections";
import type { PersistedConnectionsResult } from "./db";
import type { Wordnet, WordnetSense } from "./wordnet";

const NULL_WORDNET: Wordnet = { lookup: () => [] };

const MOCK_RESULT: ConnectionsResult = {
    meaning: "歩くという意味",
    pos: "動",
    hasConnections: true,
    connections: [{ word: "stroll", relation: "類義語", pos: "動" }],
};

const MOCK_PERSISTED_RESULT: PersistedConnectionsResult = {
    meaning: "歩くという意味",
    pos: "動",
    hasConnections: true,
    connections: [{ word: "stroll", relation: "類義語", pos: "動", relatedEntryId: null, wordnetVerified: false }],
};

describe("connectionsService", () => {
    test("generates and persists when nothing is cached yet", async () => {
        const generateConnections = mock(async () => MOCK_RESULT);
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const { ensureConnections } = createConnectionsService(db, NULL_WORDNET);

        const result = await ensureConnections(entry);

        expect(result).toEqual(MOCK_PERSISTED_RESULT);
        expect(generateConnections).toHaveBeenCalledTimes(1);
        expect(db.getConnections(entry.id)).toEqual(MOCK_PERSISTED_RESULT);
    });

    test("reads from the DB cache without calling generateConnections again", async () => {
        const generateConnections = mock(async () => MOCK_RESULT);
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const { ensureConnections } = createConnectionsService(db, NULL_WORDNET);

        await ensureConnections(entry);
        const second = await ensureConnections(entry);

        expect(second).toEqual(MOCK_PERSISTED_RESULT);
        expect(generateConnections).toHaveBeenCalledTimes(1);
    });

    test("dedupes concurrent calls for the same entry into a single generateConnections call", async () => {
        let resolveGeneration: (value: ConnectionsResult) => void;
        const pending = new Promise<ConnectionsResult>((resolve) => {
            resolveGeneration = resolve;
        });
        const generateConnections = mock(() => pending);
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const { ensureConnections } = createConnectionsService(db, NULL_WORDNET);

        const call1 = ensureConnections(entry);
        const call2 = ensureConnections(entry);
        resolveGeneration!(MOCK_RESULT);
        const [result1, result2] = await Promise.all([call1, call2]);

        expect(result1).toEqual(MOCK_PERSISTED_RESULT);
        expect(result2).toEqual(MOCK_PERSISTED_RESULT);
        expect(generateConnections).toHaveBeenCalledTimes(1);
    });

    test("does not persist on failure, so the next call retries", async () => {
        const generateConnections = mock(async (): Promise<ConnectionsResult> => {
            throw new Error("gemini unavailable");
        });
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const { ensureConnections } = createConnectionsService(db, NULL_WORDNET);

        await expect(ensureConnections(entry)).rejects.toThrow("gemini unavailable");
        expect(db.getConnections(entry.id)).toBeNull();

        generateConnections.mockImplementation(async () => MOCK_RESULT);
        const retried = await ensureConnections(entry);

        expect(retried).toEqual(MOCK_PERSISTED_RESULT);
        expect(db.getConnections(entry.id)).toEqual(MOCK_PERSISTED_RESULT);
    });

    test("links a connection to an existing entry when the generated word matches its headword", async () => {
        const generateConnections = mock(async () => ({
            meaning: "経営するという意味",
            pos: "動",
            hasConnections: true,
            connections: [{ word: "walk", relation: "対義語", pos: "動" }],
        }));
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const walk = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const run = db.insertEntry({ headword: ["run"], hint: "経営" });
        const { ensureConnections } = createConnectionsService(db, NULL_WORDNET);

        const result = await ensureConnections(run);

        expect(result.connections[0]!.relatedEntryId).toBe(walk.id);
    });

    test("passes WordNet senses for the headword into generateConnections", async () => {
        const senses: WordnetSense[] = [
            { pos: "v", definition: "walk fast", synonyms: ["stroll"], antonyms: [] },
        ];
        const wordnet: Wordnet = { lookup: mock(() => senses) };
        const generateConnections = mock(async () => MOCK_RESULT);
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const { ensureConnections } = createConnectionsService(db, wordnet);

        await ensureConnections(entry);

        expect(wordnet.lookup).toHaveBeenCalledWith("walk");
        expect(generateConnections).toHaveBeenCalledWith("walk", "歩く", senses);
    });

    test("marks a connection as wordnetVerified when the AI-picked word is among the WordNet candidates", async () => {
        const senses: WordnetSense[] = [
            { pos: "v", definition: "walk fast", synonyms: ["Stroll"], antonyms: [] },
        ];
        const wordnet: Wordnet = { lookup: () => senses };
        const generateConnections = mock(async () => ({
            meaning: "歩くという意味",
            pos: "動",
            hasConnections: true,
            connections: [
                { word: "stroll", relation: "類義語", pos: "動" }, // WordNet候補に含まれる（大文字小文字は無視）
                { word: "wander off", relation: "コロケーション", pos: "句動" }, // 候補に無い
            ],
        }));
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const { ensureConnections } = createConnectionsService(db, wordnet);

        const result = await ensureConnections(entry);

        expect(result.connections).toEqual([
            { word: "stroll", relation: "類義語", pos: "動", relatedEntryId: null, wordnetVerified: true },
            { word: "wander off", relation: "コロケーション", pos: "句動", relatedEntryId: null, wordnetVerified: false },
        ]);
    });
});
