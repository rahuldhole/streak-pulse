import { Hono } from 'hono'
import { Bindings, Theme } from './types.ts'
import { fetchGitHubData } from './github.ts'
import { calculateStreakStats } from './logic.ts'
import { renderSVG, renderLandingPage, renderErrorSVG } from './renderer.tsx'

export const app = new Hono<{ Bindings: Bindings }>()

declare const caches: any

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
  
  // Use Hono's native query parser
  if (c.req.query('user') !== undefined) {
    return c.body(renderErrorSVG(message).toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    })
  }
  
  const status = (err as any).status || 500
  return c.html(`<h1>Error: ${message}</h1>`, status)
})

app.notFound((c) => {
  // Use Hono's native query parser
  if (c.req.query('user') !== undefined) {
    return c.body(renderErrorSVG('Path Not Found').toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    })
  }
  
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
    const svg = renderSVG(mockStats as any, mockLast7 as any, 10, (c.req.query('theme') || 'dark') as Theme)
    return c.body(svg.toString(), 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' })
  }

  const queryUser = c.req.query('user');

  // If NO 'user' parameter is present (strictly undefined), return HTML
  if (queryUser === undefined) {
    if (c.req.path === '/' || c.req.path === '') {
      c.header('Cache-Control', 'public, max-age=86400, s-maxage=86400')
      c.header('Netlify-CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
      return c.html(renderLandingPage(url.origin))
    }
    return c.notFound()
  }

  // --- From here on, we MUST return an SVG (or JSON if requested) ---
  const username = queryUser.trim()

  if (!username || !GITHUB_USERNAME_REGEX.test(username)) {
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
      return c.body(renderErrorSVG('Rate Limit Exceeded').toString(), 200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Retry-After': Math.ceil((userLimit.reset - now) / 1000).toString()
      })
    }
    userLimit.count++
  } else {
    ipRateLimit.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW })
  }

  if (githubRateLimitRemaining < 50 && now < githubRateLimitResetAt) {
    const retryAfter = Math.ceil((githubRateLimitResetAt - now) / 1000)
    return c.body(renderErrorSVG('Circuit Breaker Active').toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Retry-After': retryAfter.toString()
    })
  }

  let cache: any = null
  try {
    if (typeof caches !== 'undefined') {
      cache = (caches as any).default || (await caches.open('streak-cache'))
    }
  } catch (e) {}

  const normalizedUrl = new URL(url.origin);
  normalizedUrl.searchParams.set('user', username);
  if (c.req.query('theme')) normalizedUrl.searchParams.set('theme', c.req.query('theme')!);
  if (c.req.query('type')) normalizedUrl.searchParams.set('type', c.req.query('type')!);

  const cacheKey = cache ? new Request(normalizedUrl.toString(), c.req.raw) : null;
  if (cache && cacheKey && !c.req.query('no-cache')) {
    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      const age = cachedResponse.headers.get('Age');
      if (age && parseInt(age) < 3600) {
        const response = new Response(cachedResponse.body, cachedResponse);
        response.headers.set('X-Cache', 'HIT');
        return response;
      }
    }
  }

  const token = c.env.GITHUB_TOKEN
  if (!token) {
    return c.body(renderErrorSVG('Config Error').toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    })
  }

  const theme = (c.req.query('theme') || 'transparent') as Theme

  try {
    const { days: allDays, totalContributions, contributionYears, rateLimit } = await fetchGitHubData(username, token)
    
    if (rateLimit) {
      githubRateLimitRemaining = rateLimit.remaining
      githubRateLimitResetAt = new Date(rateLimit.resetAt).getTime()
    }

    const stats = calculateStreakStats(allDays, totalContributions, contributionYears)
    const last7 = allDays.slice(-7)
    const maxCount = Math.max(...last7.map(d => d.contributionCount), 1)

    const type = c.req.query('type')
    if (type === 'json') {
      return c.json({ username, stats, last7, maxCount, theme })
    }

    const svg = renderSVG(stats, last7, maxCount, theme)
    const headers = {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-GitHub-Remaining': githubRateLimitRemaining.toString()
    }

    const finalResponse = c.body(svg.toString(), 200, headers)

    const executionCtx = (c as any).executionCtx
    if (cache && cacheKey && executionCtx?.waitUntil) {
      executionCtx.waitUntil(
        cache.put(cacheKey, finalResponse.clone()).catch(() => {})
      )
    }
    return finalResponse

  } catch (error: any) {
    const isNotFound = error.message?.includes('not found')
    const isRateLimit = error.message?.includes('Rate Limit') || error.message?.includes('429')
    const message = isNotFound ? 'User Not Found' : (isRateLimit ? 'API Rate Limit' : 'GitHub API Error')
    const errorSvg = renderErrorSVG(message)
    
    return c.body(errorSvg.toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    })
  }
})

export default app