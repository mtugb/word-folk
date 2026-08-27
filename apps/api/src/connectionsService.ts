import { generateConnections, type ConnectionsResult } from "./connections";
import type { Db, StoredEntry } from "./db";

export function createConnectionsService(db: Db) {
    // プロセス内での同時生成を防ぐ（同じentryに対してPOST直後の裏生成とGETのフォールバックが
    // 同時に走った場合、Geminiを二重に呼ばないようにする）。
    const inFlight = new Map<string, Promise<ConnectionsResult>>();

    function ensureConnections(entry: StoredEntry): Promise<ConnectionsResult> {
        const cached = db.getConnections(entry.id);
        if (cached) return Promise.resolve(cached);

        let promise = inFlight.get(entry.id);
        if (!promise) {
            promise = generateConnections(entry.headword.join(" "), entry.hint)
                .then((result) => {
                    db.saveConnections(entry.id, result);
                    return result;
                })
                .finally(() => inFlight.delete(entry.id));
            inFlight.set(entry.id, promise);
        }
        return promise;
    }

    return { ensureConnections };
}
