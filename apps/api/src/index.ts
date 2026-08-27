import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { tokenize, tokensToEntry, type Entry } from "core";

interface StoredEntry extends Entry {
    id: string;
    createdAt: string;
}

const entries: StoredEntry[] = [];

const app = new Elysia()
    .use(cors())
    .get("/", () => "Hello Elysia")
    .get("/entries", () => entries)
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

            const stored: StoredEntry = {
                ...entry,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
            };
            entries.push(stored);
            set.status = 201;
            return stored;
        },
        {
            body: t.Object({
                input: t.String(),
            }),
        }
    )
    .listen(3211);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
