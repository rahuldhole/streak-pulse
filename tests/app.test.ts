import { expect, test, describe, mock } from "bun:test";

// Mock Netlify Blobs for local testing
const mockGet = mock(async () => null);
const mockSet = mock(async () => {});

mock.module("@netlify/blobs", () => ({
  getStore: () => ({
    get: mockGet,
    setJSON: mockSet
  })
}));

import { app } from "../src/index.ts";

describe("Application Routes and Status Codes", () => {
    test("GET / (Landing Page)", async () => {
        const res = await app.request("/");
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/html");
    });

    test("GET /?user=invalid! (Bad Request SVG)", async () => {
        const res = await app.request("/?user=invalid!");
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
        const body = await res.text();
        expect(body).toContain("Invalid Username");
    });

    test("Cache Header Logic (X-Cache HIT/MISS)", async () => {
        // Second attempt with full stats object in the mock
        mockGet.mockImplementation(async (key: string) => {
            if (key.includes(':current')) {
                return { 
                    stats: { 
                      current: { count: 10, start: '2024-01-01', end: '2024-01-10' }, 
                      max: { count: 12, start: '2023-05-10', end: '2023-05-22' },
                      total: 100 
                    },
                    last7: [
                      { contributionCount: 1, date: '2024-01-01' },
                      { contributionCount: 2, date: '2024-01-02' }
                    ], 
                    maxCount: 2, 
                    timestamp: Date.now(),
                    cacheVersion: 2
                };
            }
            if (key.includes(':history')) {
              return { total: 90, years: [2023], cacheVersion: 2 };
            }
            return null;
        });

        const res = await app.request("/?user=rahuldhole");
        expect(res.headers.get("X-Cache")).toBe("HIT");
    });

    test("Rate Limiting triggers (local simulation)", async () => {
        const responses = [];
        for (let i = 0; i < 35; i++) {
           responses.push(await app.request("/?user=rahuldhole", {
             headers: { "X-Forwarded-For": "1.1.1.3" }
           }, {
             GITHUB_TOKEN: "mock-token"
           }));
        }
        
        const bodies = await Promise.all(responses.map(r => r.text()));
        expect(bodies.some(b => b.includes("Rate Limit Exceeded"))).toBe(true);
    });
});
