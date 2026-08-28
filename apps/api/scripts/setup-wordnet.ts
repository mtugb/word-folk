// Open English WordNet (CC BY 4.0) SQLite配布物を取得して apps/api/wordnet/ に展開する。
// 実行: bun run setup:wordnet
const URL = "https://x-englishwordnet.github.io/sqlite/oewn-2026-sqlite-3.0.1.sqlite.zip";
const DEST_DIR = `${import.meta.dir}/../wordnet`;
const ZIP_PATH = `${DEST_DIR}/oewn.sqlite.zip`;
const DB_PATH = `${DEST_DIR}/oewn.sqlite`;

if (await Bun.file(DB_PATH).exists()) {
    console.log(`already present: ${DB_PATH}`);
    process.exit(0);
}

await Bun.$`mkdir -p ${DEST_DIR}`;

console.log("downloading Open English WordNet (sqlite)...");
await Bun.$`curl -fsSL -o ${ZIP_PATH} ${URL}`;

console.log("extracting...");
await Bun.$`unzip -o -j ${ZIP_PATH} "*.sqlite" -d ${DEST_DIR}`;
await Bun.$`rm ${ZIP_PATH}`;

// zip内のファイル名はバージョン番号を含む（例: oewn-2026-sqlite-3.0.1.sqlite）ので、
// パスをバージョンに依存させないよう固定名にリネームする。
const extracted = Array.from(new Bun.Glob("*.sqlite").scanSync({ cwd: DEST_DIR, absolute: true }))[0];
if (!extracted) {
    throw new Error("extracted .sqlite file not found");
}
if (extracted !== DB_PATH) {
    await Bun.$`mv ${extracted} ${DB_PATH}`;
}

console.log(`done: ${DB_PATH}`);
