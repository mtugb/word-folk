import box from "../features/box/index.html";

const server = Bun.serve({
    port: 3210,
    routes: {
        "/": box,
    },
    development: {
        hmr: true,
        console: true,
    },
});

console.log(`Wordfolk running at ${server.url}`);
