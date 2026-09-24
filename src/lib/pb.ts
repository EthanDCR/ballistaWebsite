import PocketBase from "pocketbase";

// relative base URL: same-origin in prod (single Go binary), proxied
// through Vite's dev server (see vite.config.ts) in dev.
export const pb = new PocketBase("/");
