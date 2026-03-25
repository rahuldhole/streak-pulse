import { expect, test, describe, mock, beforeEach } from "bun:test";

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

describe("Contribution Aggregation Logic", () => {
    beforeEach(() => {
        mockGet.mockClear();
        mockSet.mockClear();
    });

    test("Aggregates history and current contributions correctly (Tiered)", async () => {
        const currentYear = new Date().getFullYear();
        
        mockGet.mockImplementation(async (key: string) => {
            if (key.endsWith(':history')) {
                return { total: 1000, years: [2023, 2022], cacheVersion: 2 };
            }
            if (key.endsWith(':current')) {
                return { 
                    stats: { 
                      current: { count: 5, start: `${currentYear}-01-01`, end: `${currentYear}-01-05` }, 
                      max: { count: 5, start: `${currentYear}-01-01`, end: `${currentYear}-01-05` },
                      total: 50 // ONLY THIS YEAR
                    },
                    last7: [], 
                    maxCount: 1, 
                    timestamp: Date.now(),
                    cacheVersion: 2
                };
            }
            return null;
        });

        const res = await app.request("/?user=rahuldhole&type=json");
        expect(res.status).toBe(200);
        
        const data = await res.json();
        // 1000 + 50 = 1050
        expect(data.total).toBe(1050);
    });

    test("Handles empty history correctly", async () => {
        const currentYear = new Date().getFullYear();
        
        mockGet.mockImplementation(async (key: string) => {
            if (key.endsWith(':history')) {
                return { total: 0, years: [], cacheVersion: 2 };
            }
            if (key.endsWith(':current')) {
                return { 
                    stats: { 
                      current: { count: 1, start: `${currentYear}-01-01`, end: `${currentYear}-01-01` }, 
                      max: { count: 1, start: `${currentYear}-01-01`, end: `${currentYear}-01-01` },
                      total: 1
                    },
                    last7: [], 
                    maxCount: 1, 
                    timestamp: Date.now(),
                    cacheVersion: 2
                };
            }
            return null;
        });

        const res = await app.request("/?user=rahuldhole&type=json");
        const data = await res.json();
        expect(data.total).toBe(1);
    });
});
