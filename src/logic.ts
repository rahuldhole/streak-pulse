import { GitHubContributionDay } from './types'

export function calculateStreak(days: GitHubContributionDay[]): number {
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) streak++
    else if (streak > 0) break
  }
  return streak
}

export function getIntensityColor(count: number, maxCount: number): string {
  if (count === 0) return "#1e293b14"
  const ratio = count / Math.max(maxCount, 1)

  if (ratio >= 0.75) return "#0e8a3cff"
  if (ratio >= 0.5) return "#15af4eff"
  if (ratio >= 0.25) return "#35df73ff"
  return "#60ec91ff"
}
