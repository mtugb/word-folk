import { generateConnections } from "./connections";
import type { Db, PersistedConnectionsResult, StoredEntry } from "./db";
import type { Wordnet } from "./wordnet";

export function createConnectionsService(db: Db, wordnet: Wordnet) {
    // プロセス内での同時生成を防ぐ（同じentryに対してPOST直後の裏生成とGETのフォールバックが
    // 同時に走った場合、Geminiを二重に呼ばないようにする）。
    const inFlight = new Map<string, Promise<PersistedConnectionsResult>>();

    function ensureConnections(entry: StoredEntry): Promise<PersistedConnectionsResult> {
        const cached = db.getConnections(entry.id);
        if (cached) return Promise.resolve(cached);

        let promise = inFlight.get(entry.id);
        if (!promise) {
            const headword = entry.headword.join(" ");
            const senses = wordnet.lookup(headword);
            const candidateWords = new Set(
                senses.flatMap((s) => [...s.synonyms, ...s.antonyms]).map((w) => w.toLowerCase())
            );

            promise = generateConnections(headword, entry.hint, senses)
                .then((result) =>
                    db.saveConnections(entry.id, {
                        ...result,
                        connections: result.connections.map((c) => ({
                            ...c,
                            wordnetVerified: candidateWords.has(c.word.toLowerCase()),
                        })),
                    })
                )
                .then((saved) => saved ?? db.getConnections(entry.id)!)
                .finally(() => inFlight.delete(entry.id));
            inFlight.set(entry.id, promise);
        }
        return promise;
    }

    return { ensureConnections };
}
