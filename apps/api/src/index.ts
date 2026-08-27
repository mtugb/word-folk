import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { tokenize, tokensToEntry, type Entry } from "core";
import { createConnectionsService } from "./connectionsService";
import { createDb } from "./db";

const API_TOKEN = process.env.API_TOKEN;

const db = createDb(process.env.DATABASE_PATH ?? "wordfolk.sqlite");
const { insertEntry, listEntries, getEntry } = db;
const { ensureConnections } = createConnectionsService(db);

const StoredEntrySchema = t.Object({
    id: t.String(),
    headword: t.Array(t.String()),
    hint: t.String(),
    createdAt: t.String(),
});

const app = new Elysia()
    .use(cors())
    .get("/", () => "Hello Elysia")
    .guard({
        beforeHandle({ headers, set }) {
            if (!API_TOKEN || headers["x-api-key"] !== API_TOKEN) {
                set.status = 401;
                return { error: "unauthorized" };
            }
        },
        response: {
            401: t.Object({ error: t.String() }),
        },
    })
    .get("/entries", () => listEntries(), {
        response: {
            200: t.Array(StoredEntrySchema),
        },
    })
    .get(
        "/entries/:id",
        ({ params, set }) => {
            const entry = getEntry(params.id);
            if (!entry) {
                set.status = 404;
                return { error: "見つかりません" };
            }
            return entry;
        },
        {
            response: {
                200: StoredEntrySchema,
                404: t.Object({ error: t.String() }),
            },
        }
    )
    .get(
        "/entries/:id/connections",
        async ({ params, set }) => {
            const entry = getEntry(params.id);
            if (!entry) {
                set.status = 404;
                return { error: "見つかりません" };
            }

            try {
                return await ensureConnections(entry);
            } catch (e) {
                console.error("generateConnections failed:", e);
                set.status = 502;
                return { error: "接続語の生成に失敗しました" };
            }
        },
        {
            response: {
                200: t.Object({
                    meaning: t.String(),
                    hasConnections: t.Boolean(),
                    connections: t.Array(
                        t.Object({
                            word: t.String(),
                            relation: t.String(),
                            relatedEntryId: t.Nullable(t.String()),
                        })
                    ),
                }),
                404: t.Object({ error: t.String() }),
                502: t.Object({ error: t.String() }),
            },
        }
    )
    .post(
        "/entries",
        ({ body, set }) => {
            let entry: Entry;
            try {
                entry = tokensToEntry(tokenize(body.input));
            } catch (e) {
                set.status = 400;
                return { error: e instanceof Error ? e.message : "invalid input" };
            }

            if (entry.headword.length === 0) {
                set.status = 400;
                return { error: "見出し語がありません" };
            }

            const stored = insertEntry(entry);
            ensureConnections(stored).catch((e) => {
                console.error("background connections generation failed:", e);
            });
            set.status = 201;
            return stored;
        },
        {
            body: t.Object({
                input: t.String(),
            }),
            response: {
                201: StoredEntrySchema,
                400: t.Object({ error: t.String() }),
            },
        }
    )
    .listen(3211);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
