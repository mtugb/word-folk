import box from "../features/box/index.html";
import history from "../features/history/index.html";
import entryDetail from "../features/entry-detail/index.html";

const server = Bun.serve({
    port: 3210,
    routes: {
        "/": box,
        "/history": history,
        "/entry/:id": entryDetail,
    },
    development: {
        hmr: true,
        console: true,
    },
});

console.log(`Wordfolk running at ${server.url}`);
