import { Hono } from 'hono'
import { Bindings, Theme } from './types'
import { fetchGitHubData } from './github'
import { calculateStreak } from './logic'
import { renderSVG, renderLandingPage } from './renderer'

const app = new Hono<{ Bindings: Bindings }>()

app.all('/', async (c) => {
  const username = c.req.query('user')

  if (!username) {
    return c.html(renderLandingPage())
  }

  const token = c.env.GITHUB_TOKEN
  if (!token) {
    return c.json({ error: 'GITHUB_TOKEN is not configured' }, 500)
  }

  const theme = (c.req.query('theme') || 'transparent') as Theme

  try {
    const allDays = await fetchGitHubData(username, token)
    const streak = calculateStreak(allDays)
    const last7 = allDays.slice(-7)
    const maxCount = Math.max(...last7.map(d => d.contributionCount), 1)

    const type = c.req.query('type')

    if (type === 'json') {
      return c.json({
        username,
        streak,
        last7,
        maxCount,
        theme
      })
    }

    const svg = renderSVG(streak, last7, maxCount, theme)
    return c.body(svg, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'max-age=3600'
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

export default app
