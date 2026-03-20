import { Hono } from 'hono'
import { Bindings, Theme } from './types.ts'
import { fetchGitHubData } from './github.ts'
import { calculateStreakStats } from './logic.ts'
import { renderSVG, renderLandingPage, renderErrorSVG } from './renderer.tsx'

const app = new Hono<{ Bindings: Bindings }>()

// Global type for Cloudflare caches
declare const caches: any

app.all('/', async (c) => {
  const url = new URL(c.req.url)
  const username = url.searchParams.get('user')

  if (!username) {
    c.header('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    c.header('Netlify-CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    const origin = url.origin
    return c.html(renderLandingPage(origin))
  }

  // Cache API: Store the rendered SVG to avoid redundant executions and GitHub API calls.
  // We check for 'caches' existence and use environment-specific defaults.
  let cache: any = null
  try {
    if (typeof caches !== 'undefined') {
      // Cloudflare uses 'caches.default', while Netlify/Deno standard is 'caches.open'
      cache = (caches as any).default || (await caches.open('streak-cache'))
    }
  } catch (e) {
    console.error('Cache API not available:', e)
  }

  const cacheKey = cache ? new Request(url.toString(), c.req.raw) : null
  
  if (cache && cacheKey) {
    let response = await cache.match(cacheKey)
    if (response) {
      // Return cached response with an added header for observability
      const cachedResponse = new Response(response.body, response)
      cachedResponse.headers.set('X-Cache', 'HIT')
      return cachedResponse
    }
  }

  const token = c.env.GITHUB_TOKEN
  if (!token) {
    const errorSvg = renderErrorSVG('Config Error')
    return c.body(errorSvg.toString(), 500, {
      'Content-Type': 'image/svg+xml'
    })
  }

  const theme = (url.searchParams.get('theme') || 'transparent') as Theme

  try {
    const { days: allDays, totalContributions, contributionYears } = await fetchGitHubData(username, token)
    const stats = calculateStreakStats(allDays, totalContributions, contributionYears)
    const last7 = allDays.slice(-7)
    const maxCount = Math.max(...last7.map(d => d.contributionCount), 1)

    const type = url.searchParams.get('type')

    if (type === 'json') {
      return c.json({
        username,
        stats,
        last7,
        maxCount,
        theme
      })
    }

    const svg = renderSVG(stats, last7, maxCount, theme)
    
    // Set headers for Netlify and other CDNs
    // stale-while-revalidate=604800 (1 week) allows serving slightly stale content while fetching fresh data in the background.
    const headers = {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=7200',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=604800'
    }

    const finalResponse = c.body(svg.toString(), 200, headers)

    // Populate cache asynchronously if supported (Cloudflare/Netlify)
    const executionCtx = (c as any).executionCtx
    if (cache && cacheKey && executionCtx?.waitUntil) {
      executionCtx.waitUntil(cache.put(cacheKey, finalResponse.clone()))
    }
    return finalResponse

  } catch (error: any) {
    const isNotFound = error.message?.includes('not found')
    const errorSvg = renderErrorSVG(isNotFound ? 'User Not Found' : 'GitHub API Error')
    
    return c.body(errorSvg.toString(), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache'
    })
  }
})

export default app
