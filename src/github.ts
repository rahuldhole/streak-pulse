import { GitHubContributionDay, GitHubResponse } from './types'

const GITHUB_GRAPHQL_QUERY = `
query($login:String!) {
  user(login:$login) {
    contributionsCollection {
      contributionCalendar {
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

export async function fetchGitHubData(username: string, token: string): Promise<GitHubContributionDay[]> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
      "User-Agent": "Streak-Pulse-Worker"
    },
    body: JSON.stringify({
      query: GITHUB_GRAPHQL_QUERY,
      variables: { login: username }
    })
  })

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.statusText}`)
  }

  const json = (await res.json()) as GitHubResponse
  if (!json.data?.user) {
    throw new Error(`User ${username} not found`)
  }

  return json.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap(w => w.contributionDays)
}
