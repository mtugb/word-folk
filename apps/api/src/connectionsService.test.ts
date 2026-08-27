import { describe, expect, mock, test } from "bun:test";
import type { ConnectionsResult } from "./connections";
import type { PersistedConnectionsResult } from "./db";

const MOCK_RESULT: ConnectionsResult = {
    meaning: "歩くという意味",
    hasConnections: true,
    connections: [{ word: "stroll", relation: "類義語" }],
};

const MOCK_PERSISTED_RESULT: PersistedConnectionsResult = {
    meaning: "歩くという意味",
    hasConnections: true,
    connections: [{ word: "stroll", relation: "類義語", relatedEntryId: null }],
};

describe("connectionsService", () => {
    test("generates and persists when nothing is cached yet", async () => {
        const generateConnections = mock(async () => MOCK_RESULT);
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const entry = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const { ensureConnections } = createConnectionsService(db);

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
        const { ensureConnections } = createConnectionsService(db);

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
        const { ensureConnections } = createConnectionsService(db);

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
        const { ensureConnections } = createConnectionsService(db);

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
            hasConnections: true,
            connections: [{ word: "walk", relation: "対義語" }],
        }));
        mock.module("./connections", () => ({ generateConnections }));
        const { createConnectionsService } = await import("./connectionsService");
        const { createDb } = await import("./db");

        const db = createDb(":memory:");
        const walk = db.insertEntry({ headword: ["walk"], hint: "歩く" });
        const run = db.insertEntry({ headword: ["run"], hint: "経営" });
        const { ensureConnections } = createConnectionsService(db);

        const result = await ensureConnections(run);

        expect(result.connections[0]!.relatedEntryId).toBe(walk.id);
    });
});
