import { GitHubContributionDay } from './types.ts'

const GITHUB_GRAPHQL_QUERY = `
query($login:String!) {
  user(login:$login) {
    contributionsCollection {
      contributionYears
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`

export async function fetchGitHubData(username: string, token: string, targetYear?: number): Promise<{ 
  days: GitHubContributionDay[], 
  totalContributions: number, 
  contributionYears: number[],
  rateLimit?: { remaining: number, resetAt: string } 
}> {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token,
    "User-Agent": "Github-Streak-Worker"
  }

  // Initial fetch to get the current calendar and the list of contribution years
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: GITHUB_GRAPHQL_QUERY,
      variables: { login: username }
    })
  })

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.statusText}`)
  }

  const json = (await res.json()) as any
  if (!json.data?.user) {
    throw new Error(`User ${username} not found`)
  }

  const user = json.data.user
  const currentCalendar = user.contributionsCollection.contributionCalendar
  const years: number[] = user.contributionsCollection.contributionYears

  // Extract rate limit from headers
  const remaining = res.headers.get("X-RateLimit-Remaining")
  const resetAt = res.headers.get("X-RateLimit-Reset")
  const rateLimit = remaining && resetAt ? { 
    remaining: parseInt(remaining), 
    resetAt: new Date(parseInt(resetAt) * 1000).toISOString() 
  } : undefined

  // LIGHT MODE: If we only need the current year's streak data
  if (targetYear && targetYear === new Date().getFullYear()) {
    return {
      days: currentCalendar.weeks.flatMap((w: any) => w.contributionDays),
      totalContributions: currentCalendar.totalContributions,
      contributionYears: [targetYear],
      rateLimit
    }
  }

  if (years.length === 0) {
    return {
      days: currentCalendar.weeks.flatMap((w: any) => w.contributionDays),
      totalContributions: currentCalendar.totalContributions,
      contributionYears: [],
      rateLimit
    }
  }

  const CHUNK_SIZE = 5
  // Split years into chunks
  const chunks: number[][] = []
  for (let i = 0; i < years.length; i += CHUNK_SIZE) {
    chunks.push(years.slice(i, i + CHUNK_SIZE))
  }

  // Build aliased GraphQL query per chunk
  const buildChunkQuery = (chunk: number[]) => `
    query($login: String!) {
      user(login: $login) {
        ${chunk.map(year => `
          y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") {
            contributionCalendar {
              totalContributions
            }
          }
        `).join('\n')}
      }
    }
  `

  // Fetch all chunks in parallel
  const chunkResults = await Promise.all(
    chunks.map(chunk =>
      fetch("https://api.github.com/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: buildChunkQuery(chunk),
          variables: { login: username }
        })
      }).then(async res => {
        if (!res.ok) throw new Error(`GitHub batch API error: ${res.statusText}`)
        const json = (await res.json()) as any
        return json.data?.user || {}
      })
    )
  )

  // Sum totals across all chunks
  const allTimeTotal = chunkResults.reduce((total: number, chunkData: any) => {
    return total + Object.values(chunkData).reduce((sum: number, collection: any) => {
      return sum + (collection?.contributionCalendar?.totalContributions || 0)
    }, 0)
  }, 0)

  return {
    days: currentCalendar.weeks.flatMap((w: any) => w.contributionDays),
    totalContributions: allTimeTotal,
    contributionYears: years,
    rateLimit
  }
}
