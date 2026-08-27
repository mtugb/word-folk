import box from "../features/box/index.html";
import history from "../features/history/index.html";
import wordDetail from "../features/word-detail/index.html";

const server = Bun.serve({
    port: 3210,
    routes: {
        "/": box,
        "/history": history,
        "/word/:headword": wordDetail,
    },
    development: {
        hmr: true,
        console: true,
    },
});

console.log(`Wordfolk running at ${server.url}`);
