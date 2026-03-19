export type Bindings = {
  GITHUB_TOKEN: string
}

export type GitHubContributionDay = {
  date: string
  contributionCount: number
}

export type GitHubResponse = {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: {
            contributionDays: GitHubContributionDay[]
          }[]
        }
      }
    }
  }
}

export type Theme = 'light' | 'dark' | 'transparent'
