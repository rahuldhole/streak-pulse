import { expect, test, describe, mock } from "bun:test";

// Mock Netlify Blobs
const mockGet = mock(async () => null);
const mockSet = mock(async () => {});

mock.module("@netlify/blobs", () => ({
  getStore: () => ({
    get: mockGet,
    setJSON: mockSet
  })
}));

// Mock GitHub API function to track calls
const mockFetchGitHub = mock(async () => ({
    days: [],
    contributionYears: [2024],
    totalContributions: 100,
    rateLimit: { remaining: 5000, resetAt: new Date().toISOString() }
}));

mock.module("../src/github.ts", () => ({
    fetchGitHubData: mockFetchGitHub
}));

import { app } from "../src/index.ts";

describe("Cache Versioning Logic", () => {
    test("Full refresh is triggered when cacheVersion in blob is missing", async () => {
        mockFetchGitHub.mockClear();
        mockGet.mockImplementation(async (key: string) => {
            if (key.includes(':current')) return { 
                stats: { total: 10, current: {}, max: {} }, 
                timestamp: Date.now(),
                last7: [],
                maxCount: 1
            }; 
            if (key.includes(':history')) return { total: 100, years: [2023] };
            return null;
        });

        await app.request("/?user=tester", {}, { GITHUB_TOKEN: "test" });
        
        // Check if fetchGitHubData was called with targetYear = undefined (Full Refresh)
        expect(mockFetchGitHub.mock.calls.length).toBe(1);
        const lastCall = mockFetchGitHub.mock.calls[0];
        expect(lastCall[2]).toBeUndefined(); 
    });

    test("Full refresh is triggered when cacheVersion in blob is older", async () => {
        mockFetchGitHub.mockClear();
        mockGet.mockImplementation(async (key: string) => {
            if (key.includes(':current')) return { 
                stats: { total: 10, current: {}, max: {} }, 
                timestamp: Date.now(), 
                cacheVersion: 1, // Older version
                last7: [],
                maxCount: 1
            }; 
            if (key.includes(':history')) return { total: 100, years: [2023], cacheVersion: 1 };
            return null;
        });

        await app.request("/?user=tester", {}, { GITHUB_TOKEN: "test" });
        
        expect(mockFetchGitHub.mock.calls.length).toBe(1);
        const lastCall = mockFetchGitHub.mock.calls[0];
        expect(lastCall[2]).toBeUndefined(); 
    });

    test("Tiered fetch is used when cacheVersion in blob matches activeVersion but time is stale", async () => {
        mockFetchGitHub.mockClear();
        // Since package.json has cacheStoreVersion "2", we use 2 here.
        mockGet.mockImplementation(async (key: string) => {
            if (key.includes(':current')) return { 
                stats: { total: 10, current: {}, max: {} }, 
                timestamp: 0, // Force timestamp staleness
                cacheVersion: 2,
                last7: [],
                maxCount: 1
            }; 
            if (key.includes(':history')) return { total: 100, years: [2023], cacheVersion: 2 };
            return null;
        });

        await app.request("/?user=tester", {}, { GITHUB_TOKEN: "test" });
        
        expect(mockFetchGitHub.mock.calls.length).toBe(1);
        const lastCall = mockFetchGitHub.mock.calls[0];
        // targetYear should be defined (current year) -> Tiered fetch
        expect(lastCall[2]).toBeDefined();
        expect(lastCall[2]).toBe(new Date().getFullYear());
    });
});
