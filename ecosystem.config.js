module.exports = {
    apps: [
        {
            name: "wordfolk-web",
            cwd: "./apps/web",
            script: "bun",
            args: "run start",
        },
        {
            name: "wordfolk-api",
            cwd: "./apps/api",
            script: "bun",
            args: "run start",
        },
    ],
};
