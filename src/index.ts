import { Hono } from 'hono'
import { getStore } from '@netlify/blobs'
import { Bindings, Theme } from './types.ts'
import { fetchGitHubData } from './github.ts'
import { calculateStreakStats } from './logic.ts'
import { renderSVG, renderLandingPage, renderErrorSVG } from './renderer.tsx'

export const app = new Hono<{ Bindings: Bindings }>()

export const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

const ipRateLimit = new Map<string, { count: number, reset: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 
const MAX_REQUESTS_PER_WINDOW = 30

let githubRateLimitRemaining = 5000
let githubRateLimitResetAt = 0

// Global error handler
app.onError((err, c) => {
  console.error('App Error:', err)
  const message = err.message || 'Internal Server Error'
  if (c.req.query('user') !== undefined) {
    c.header('Vary', 'Accept')
    return c.body(renderErrorSVG(message).toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    })
  }
  const status = (err as any).status || 500
  c.header('Vary', 'Accept')
  return c.html(`<h1>Error: ${message}</h1>`, status)
})

app.notFound((c) => {
  if (c.req.query('user') !== undefined) {
    c.header('Vary', 'Accept')
    return c.body(renderErrorSVG('Path Not Found').toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    })
  }
  c.header('Vary', 'Accept')
  return c.html('<h1>404 Not Found</h1>', 404)
})

app.all('*', async (c) => {
  const url = new URL(c.req.url)

  if (c.req.path === '/sample.svg') {
    const mockStats = { 
      current: { count: 42, start: '2024-01-01', end: '2024-02-12' }, 
      max: { count: 99, start: '2023-05-10', end: '2023-08-17' }, 
      total: 1337,
      yearRange: '2015 - 2024'
    }
    const mockLast7 = [
      { contributionCount: 4, date: '2024-03-01' },
      { contributionCount: 10, date: '2024-03-02' },
      { contributionCount: 2, date: '2024-03-03' },
      { contributionCount: 8, date: '2024-03-04' },
      { contributionCount: 5, date: '2024-03-05' },
      { contributionCount: 7, date: '2024-03-06' },
      { contributionCount: 3, date: '2024-03-07' }
    ]
    const svg = renderSVG(mockStats as any, mockLast7 as any, 10, (c.req.query('theme') || 'dark') as Theme, 'Sample Data')
    c.header('Vary', 'Accept')
    return c.body(svg.toString(), 200, { 
      'Content-Type': 'image/svg+xml', 
      'Cache-Control': 'no-store, no-cache, must-revalidate' 
    })
  }

  const queryUser = c.req.query('user');

  if (queryUser === undefined) {
    if (c.req.path === '/' || c.req.path === '') {
      c.header('Vary', 'Accept')
      c.header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      c.header('Netlify-CDN-Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600')
      return c.html(renderLandingPage(url.origin))
    }
    c.header('Vary', 'Accept')
    return c.notFound()
  }

  const username = queryUser.trim()
  const theme = (c.req.query('theme') || 'transparent') as Theme
  const type = c.req.query('type')
  const forceRefresh = c.req.query('no-cache') === 'true'

  if (!username || !GITHUB_USERNAME_REGEX.test(username)) {
    c.header('Vary', 'Accept')
    return c.body(renderErrorSVG('Invalid Username').toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    })
  }

  const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown'
  const now = Date.now()
  const userLimit = ipRateLimit.get(ip)
  if (userLimit && now < userLimit.reset) {
    if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
      c.header('Vary', 'Accept')
      return c.body(renderErrorSVG('Rate Limit Exceeded').toString(), 200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      })
    }
    userLimit.count++
  } else {
    ipRateLimit.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW })
  }

  const streakStore = getStore('streak-data')
  const historyKey = `${username}:history`
  const currentKey = `${username}:current`
  const currentYear = new Date().getFullYear()

  let historyBlob: any = null
  let currentBlob: any = null
  
  try {
    historyBlob = await streakStore.get(historyKey, { type: 'json' })
    currentBlob = await streakStore.get(currentKey, { type: 'json' })
  } catch (e) {
    console.error('Blob fetch failed:', e)
  }

  const isCurrentStale = !currentBlob || (Date.now() - currentBlob.timestamp > 3600000)
  
  if (isCurrentStale || forceRefresh || !historyBlob) {
    const token = c.env.GITHUB_TOKEN
    if (!token) return c.body(renderErrorSVG('Config Error').toString(), 200, { 'Content-Type': 'image/svg+xml' });

    try {
      // TIERED FETCH: If we have history, only fetch the current year
      const targetYear = (historyBlob && !forceRefresh) ? currentYear : undefined
      const fresh = await fetchGitHubData(username, token, targetYear)
      
      if (fresh.rateLimit) {
        githubRateLimitRemaining = fresh.rateLimit.remaining
        githubRateLimitResetAt = new Date(fresh.rateLimit.resetAt).getTime()
      }

      // If we did a full fetch (no targetYear set), calculate and update history
      if (!targetYear) {
        const histTotal = fresh.totalContributions - fresh.days.filter(d => d.date.startsWith(currentYear.toString())).reduce((a, b) => a + b.contributionCount, 0)
        historyBlob = { total: histTotal, years: fresh.contributionYears.filter(y => y !== currentYear) }
        await streakStore.setJSON(historyKey, historyBlob).catch(() => {})
      }

      const stats = calculateStreakStats(fresh.days, fresh.totalContributions, fresh.contributionYears)
      const last7 = fresh.days.slice(-7)
      const maxCount = Math.max(...last7.map(d => d.contributionCount), 1)

      currentBlob = { stats, last7, maxCount, timestamp: Date.now() }
      await streakStore.setJSON(currentKey, currentBlob).catch(() => {})
    } catch (error: any) {
      if (currentBlob) {
        // Fallback to stale data
      } else {
        const isNotFound = error.message?.includes('not found')
        return c.body(renderErrorSVG(isNotFound ? 'User Not Found' : 'GitHub API Error').toString(), 200, { 'Content-Type': 'image/svg+xml' });
      }
    }
  }

  // Final Aggregation: Combine cached history with current data
  // Even if we fetched 'fresh', the fresh.totalContributions is already correct in currentBlob.stats.total
  // But if history exists, we should ensure the combined total reflects both.
  // Actually, if we fetch 'onlyCurrent', fresh.totalContributions IS the total for the current calendar (last 365 days).
  // So we merge: history.total + currentBlob.stats.total
  const aggregatedTotal = (historyBlob?.total || 0) + currentBlob.stats.total
  const lastUpdated = new Date(currentBlob.timestamp).toLocaleTimeString()

  if (type === 'json') {
    c.header('Vary', 'Accept')
    return c.json({ username, ...currentBlob, total: aggregatedTotal, theme })
  }

  const svg = renderSVG({ ...currentBlob.stats, total: aggregatedTotal }, currentBlob.last7, currentBlob.maxCount, theme, lastUpdated)
  return c.body(svg.toString(), 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Vary': 'Accept',
    'X-Cache': isCurrentStale ? 'MISS' : 'HIT'
  })
})

export default app