import { expect, test, describe } from "bun:test";
import { app } from "../src/index.ts";

describe("Application Routes and Status Codes", () => {
    test("GET / (Landing Page)", async () => {
        const res = await app.request("/");
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/html");
    });

    test("GET /?user=invalid! (Bad Request SVG)", async () => {
        const res = await app.request("/?user=invalid!");
        // Status must be 200 for GitHub Camo to display the error SVG
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
        const body = await res.text();
        expect(body).toContain("Invalid Username");
    });

    test("Rate Limiting triggers (local simulation)", async () => {
        const responses = [];
        for (let i = 0; i < 35; i++) {
           responses.push(await app.request("/?user=rahuldhole", {
             headers: { "X-Forwarded-For": "1.1.1.1" }
           }, {
             GITHUB_TOKEN: "mock-token"
           }));
        }
        
        // All responses should be 200 for Camo, but the last ones should be rate limited
        const bodies = await Promise.all(responses.map(r => r.text()));
        expect(bodies.some(b => b.includes("Rate Limit Exceeded"))).toBe(true);
    });
});
