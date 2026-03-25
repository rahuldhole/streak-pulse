# Netlify
1. Create a GitHub classic token with `user:read` permissions.
2. Add `GITHUB_TOKEN` to environment variables in the Netlify UI.
3. Deploy (automatic on push) or manually:
   ```bash
   npx netlify deploy --prod
   ```

## 🛠️ Development & Cache Management

### 🔄 Forced Cache Refresh

To force a full recalculation of the cache (history + current) for all users, update the `cacheStoreVersion` in `package.json`:

1.  Open `package.json`.
2.  Increment the `"cacheStoreVersion"` (e.g., change `"2"` to `"3"`).
3.  Deploy.

The system compares this version against the one stored in the cache. If the `package.json` version is higher, it triggers a full fetch from the GitHub API, ensuring your latest logic is applied to all data.
