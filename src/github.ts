import { GitHubContributionDay, GitHubResponse } from './types'

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
    "User-Agent": "Streak-Pulse-Worker"
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
  // We use GraphQL aliases to fetch all years in a single batch request to solve the N+1 problem.
  
  if (years.length === 0) {
    return {
      days: currentCalendar.weeks.flatMap((w: any) => w.contributionDays),
      totalContributions: currentCalendar.totalContributions,
      contributionYears: []
    }
  }

  // Construct a batch query with aliases for each year
  const aliasQuery = `
    query($login: String!) {
      user(login: $login) {
        ${years.map(year => `
          y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") {
            contributionCalendar {
              totalContributions
            }
          }
        `).join('\n')}
      }
    }
  `

  const batchRes = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: aliasQuery,
      variables: { login: username }
    })
  })

  if (!batchRes.ok) {
    throw new Error(`GitHub batch API error: ${batchRes.statusText}`)
  }

  const batchJson = (await batchRes.json()) as any
  const batchData = batchJson.data?.user || {}
  
  const allTimeTotal = Object.values(batchData).reduce((sum: number, collection: any) => {
    return sum + (collection?.contributionCalendar?.totalContributions || 0)
  }, 0)

  return {
    days: currentCalendar.weeks.flatMap((w: any) => w.contributionDays),
    totalContributions: allTimeTotal,
    contributionYears: years
  }
}
