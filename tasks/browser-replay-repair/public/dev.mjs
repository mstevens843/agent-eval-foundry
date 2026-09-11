import { readFileSync } from "node:fs";
import { startApplication } from "./app/server.mjs";
const fixture = JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url)));
const app = await startApplication(fixture, { port: Number(process.argv[2] ?? 3000) });
console.log("Application: " + app.url + " — facts: /facts?path=/records/account-7 — server history: /debug");
