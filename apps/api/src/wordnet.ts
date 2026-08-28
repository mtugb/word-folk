import { Database } from "bun:sqlite";

export interface WordnetSense {
    pos: string;
    definition: string;
    synonyms: string[];
    antonyms: string[];
}

export interface Wordnet {
    lookup(word: string): WordnetSense[];
}

const NULL_WORDNET: Wordnet = { lookup: () => [] };

interface SenseRow {
    senseid: number;
    synsetid: number;
    wordid: number;
    posid: string;
    definition: string;
}

/**
 * Open English WordNet (CC BY 4.0, https://en-word.net/) をSQLite配布形式で読む。
 * `bun run setup:wordnet` で取得したファイルが無い場合は、裏取りなし（全てAI生成扱い）として
 * 動作を続行できるよう、常に空配列を返すダミー実装にフォールバックする。
 */
export function createWordnet(dbPath: string): Wordnet {
    let db: Database;
    try {
        db = new Database(dbPath, { readonly: true });
    } catch {
        console.warn(`wordnet db not found at ${dbPath} — connections will not be WordNet-verified`);
        return NULL_WORDNET;
    }

    const antonymRelationId = db
        .query<{ relationid: number }, []>("SELECT relationid FROM relations WHERE relation = 'antonym'")
        .get()?.relationid;

    const sensesForWord = db.query<SenseRow, [string]>(`
        SELECT se.senseid, se.synsetid, se.wordid, sy.posid, sy.definition
        FROM words w
        JOIN senses se ON se.wordid = w.wordid
        JOIN synsets sy ON sy.synsetid = se.synsetid
        WHERE w.word = ?
    `);

    const synonymsForSense = db.query<{ word: string }, [number, number]>(`
        SELECT w2.word
        FROM senses s2
        JOIN words w2 ON w2.wordid = s2.wordid
        WHERE s2.synsetid = ? AND s2.senseid != ?
    `);

    const antonymsForSense = db.query<{ word: string }, [number, number, number]>(`
        SELECT w2.word
        FROM lexrelations lr
        JOIN words w2 ON w2.wordid = lr.word2id
        WHERE lr.synset1id = ? AND lr.word1id = ? AND lr.relationid = ?
    `);

    function lookup(word: string): WordnetSense[] {
        const normalized = word.trim().toLowerCase();
        return sensesForWord.all(normalized).map((sense) => ({
            pos: sense.posid,
            definition: sense.definition,
            synonyms: synonymsForSense.all(sense.synsetid, sense.senseid).map((r) => r.word),
            antonyms:
                antonymRelationId === undefined
                    ? []
                    : antonymsForSense.all(sense.synsetid, sense.wordid, antonymRelationId).map((r) => r.word),
        }));
    }

    return { lookup };
}
