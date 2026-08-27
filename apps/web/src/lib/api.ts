import { treaty } from "@elysiajs/eden";
import type { App } from "api";

// In production behind the nginx config in deploy/nginx/, the api is
// reachable at /api on the same origin as the page (set PUBLIC_API_URL to
// e.g. https://your-domain.com/api). Locally, it runs on its own port.
const apiUrl = process.env.PUBLIC_API_URL || `${window.location.hostname}:3211`;

export const api = treaty<App>(apiUrl, {
    headers: {
        "x-api-key": process.env.PUBLIC_API_TOKEN ?? "",
    },
});
