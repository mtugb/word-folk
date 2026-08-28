import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { tmpdir } from "node:os";
import { createWordnet } from "./wordnet";

const fixturePaths: string[] = [];

function fixturePath(): string {
    const path = `${tmpdir()}/wordnet-test-${crypto.randomUUID()}.sqlite`;
    fixturePaths.push(path);
    return path;
}

afterEach(async () => {
    while (fixturePaths.length > 0) {
        await Bun.$`rm -f ${fixturePaths.pop()}`.quiet();
    }
});

/**
 * OEWNのSQLite配布物と同じ最小限のスキーマ・データを持つ一時DBを作り、
 * 本物の144MBファイルに依存せずクエリロジックだけをテストする。
 */
function buildFixture(path: string) {
    const db = new Database(path);
    db.run(`CREATE TABLE words (wordid INT NOT NULL, word VARCHAR(80) NOT NULL)`);
    db.run(`CREATE TABLE senses (senseid INT NOT NULL, synsetid INT NOT NULL, wordid INT NOT NULL, luid INT NOT NULL)`);
    db.run(`CREATE TABLE synsets (synsetid INT NOT NULL, posid CHAR(1) NOT NULL, definition TEXT NOT NULL)`);
    db.run(`CREATE TABLE relations (relationid INT NOT NULL, relation VARCHAR(50) NOT NULL)`);
    db.run(
        `CREATE TABLE lexrelations (synset1id INT NOT NULL, word1id INT NOT NULL, synset2id INT NOT NULL, word2id INT NOT NULL, relationid INT NOT NULL)`
    );

    const words: [number, string][] = [
        [1, "large"],
        [2, "big"],
        [3, "small"],
        [4, "happy"],
        [5, "glad"],
        [6, "felicitous"],
    ];
    for (const [wordid, word] of words) db.run(`INSERT INTO words VALUES (?, ?)`, [wordid, word]);

    // synset 100: "large" と "big" が属する形容詞義。synset 200: "happy" 系の形容詞義。
    db.run(`INSERT INTO synsets VALUES (100, 'a', 'above average in size or number or quantity')`);
    db.run(`INSERT INTO synsets VALUES (200, 'a', 'enjoying or showing or marked by joy or pleasure')`);

    db.run(`INSERT INTO senses VALUES (10, 100, 1, 10)`); // large
    db.run(`INSERT INTO senses VALUES (11, 100, 2, 11)`); // big
    db.run(`INSERT INTO senses VALUES (12, 200, 4, 12)`); // happy
    db.run(`INSERT INTO senses VALUES (13, 200, 5, 13)`); // glad
    db.run(`INSERT INTO senses VALUES (14, 200, 6, 14)`); // felicitous

    db.run(`INSERT INTO relations VALUES (30, 'antonym')`);

    // large <-antonym-> small (synset 100の意味に限定)
    db.run(`INSERT INTO lexrelations VALUES (100, 1, 100, 3, 30)`);

    db.close();
}

describe("wordnet", () => {
    test("lookup returns pos, definition, synonyms and antonyms for a matched sense", () => {
        const path = fixturePath();
        buildFixture(path);
        const wordnet = createWordnet(path);

        expect(wordnet.lookup("large")).toEqual([
            {
                pos: "a",
                definition: "above average in size or number or quantity",
                synonyms: ["big"],
                antonyms: ["small"],
            },
        ]);
    });

    test("lookup collects every sense a headword has, each with its own synonyms/antonyms", () => {
        const path = fixturePath();
        buildFixture(path);
        const wordnet = createWordnet(path);

        expect(wordnet.lookup("happy")).toEqual([
            {
                pos: "a",
                definition: "enjoying or showing or marked by joy or pleasure",
                synonyms: ["glad", "felicitous"],
                antonyms: [],
            },
        ]);
    });

    test("lookup is case-insensitive", () => {
        const path = fixturePath();
        buildFixture(path);
        const wordnet = createWordnet(path);

        expect(wordnet.lookup("LARGE")[0]!.synonyms).toEqual(["big"]);
    });

    test("lookup returns an empty array for a word not in WordNet", () => {
        const path = fixturePath();
        buildFixture(path);
        const wordnet = createWordnet(path);

        expect(wordnet.lookup("notaword")).toEqual([]);
    });

    test("falls back to a no-op lookup when the db file doesn't exist", () => {
        const wordnet = createWordnet(`${tmpdir()}/does-not-exist-${crypto.randomUUID()}.sqlite`);

        expect(wordnet.lookup("large")).toEqual([]);
    });
});
