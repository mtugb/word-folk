import box from "../features/box/index.html";
import history from "../features/history/index.html";

const server = Bun.serve({
    port: 3210,
    routes: {
        "/": box,
        "/history": history,
    },
    development: {
        hmr: true,
        console: true,
    },
});

console.log(`Wordfolk running at ${server.url}`);
