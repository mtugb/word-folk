import { generateConnections } from "./connections";
import type { Db, PersistedConnectionsResult, StoredEntry } from "./db";

export function createConnectionsService(db: Db) {
    // プロセス内での同時生成を防ぐ（同じentryに対してPOST直後の裏生成とGETのフォールバックが
    // 同時に走った場合、Geminiを二重に呼ばないようにする）。
    const inFlight = new Map<string, Promise<PersistedConnectionsResult>>();

    function ensureConnections(entry: StoredEntry): Promise<PersistedConnectionsResult> {
        const cached = db.getConnections(entry.id);
        if (cached) return Promise.resolve(cached);

        let promise = inFlight.get(entry.id);
        if (!promise) {
            promise = generateConnections(entry.headword.join(" "), entry.hint)
                .then((result) => db.saveConnections(entry.id, result) ?? db.getConnections(entry.id)!)
                .finally(() => inFlight.delete(entry.id));
            inFlight.set(entry.id, promise);
        }
        return promise;
    }

    return { ensureConnections };
}
