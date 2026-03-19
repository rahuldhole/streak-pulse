import { Hono } from 'hono'
import { Bindings, Theme } from './types'
import { fetchGitHubData } from './github'
import { calculateStreakStats } from './logic'
import { renderSVG, renderLandingPage, renderErrorSVG } from './renderer'

const app = new Hono<{ Bindings: Bindings }>()

app.all('/', async (c) => {
  const url = new URL(c.req.url)
  const username = url.searchParams.get('user')

  if (!username) {
    c.header('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    const origin = url.origin
    return c.html(renderLandingPage(origin))
  }

  // Cloudflare Cache API: Store the rendered SVG to avoid redundant Worker executions and GitHub API calls
  const cache = (caches as any).default
  const cacheKey = new Request(url.toString(), c.req.raw)
  let response = await cache.match(cacheKey)
  if (response) return response

  const token = c.env.GITHUB_TOKEN
  if (!token) {
    return c.body(renderErrorSVG('Config Error'), 500, {
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
    const finalResponse = c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=7200'
    })

    // Populate cache asynchronously
    c.executionCtx.waitUntil(cache.put(cacheKey, finalResponse.clone()))
    return finalResponse

  } catch (error: any) {
    const isNotFound = error.message?.includes('not found')
    const errorSvg = renderErrorSVG(isNotFound ? 'User Not Found' : 'GitHub API Error')
    
    return c.body(errorSvg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache'
    })
  }
})

export default app
