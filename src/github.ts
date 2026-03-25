import { GitHubContributionDay, GitHubResponse } from './types.ts'

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

export async function fetchGitHubData(username: string, token: string): Promise<{ days: GitHubContributionDay[], totalContributions: number, contributionYears: number[] }> {
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

  // The first call returns the last 365 days of contributions, which we use for the streak display.
  // For the "Total Contributions" count, we need to sum up all time contributions across all years.
  //
  // Accounts with 10+ years of history can exceed GitHub's GraphQL complexity limit in a single
  // batched alias query. To avoid this, we chunk the years into batches of 5 and run them in
  // parallel via Promise.all. Past-year data is immutable, so results are deterministic.

  if (years.length === 0) {
    return {
      days: currentCalendar.weeks.flatMap((w: any) => w.contributionDays),
      totalContributions: currentCalendar.totalContributions,
      contributionYears: []
    }
  }

  const CHUNK_SIZE = 5

  // Split years into chunks of CHUNK_SIZE
  const chunks: number[][] = []
  for (let i = 0; i < years.length; i += CHUNK_SIZE) {
    chunks.push(years.slice(i, i + CHUNK_SIZE))
  }

  // Build one GraphQL query per chunk using aliased contributionsCollection fields
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
    contributionYears: years
  }
}
