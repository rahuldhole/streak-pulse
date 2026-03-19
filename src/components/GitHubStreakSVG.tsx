import { GitHubContributionDay, Theme } from '../types'
import { getIntensityColor, StreakStats } from '../logic'

function formatDate(dateStr: string): string {
  if (!dateStr) return '---'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(num)
}

export const themes = {
  light: {
    bg: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    accent: '#22c55e'
  },
  dark: {
    bg: '#0B1220',
    border: '#1E293B',
    text: '#FFFFFF',
    textMuted: '#94A3B8',
    accent: '#22c55e'
  },
  transparent: {
    bg: 'none',
    border: 'none',
    text: '#626a75ff',
    textMuted: '#576374ff',
    accent: '#15af4eff'
  }
}

interface StatItemProps {
  label: string
  value: string | number
  subValue: string
  x: number | string
  y: number | string
}

const StatItem = ({ label, value, subValue, x, y }: StatItemProps) => (
  <g transform={`translate(${x}, ${y})`}>
    <text class="label">{label}</text>
    <text y="28" class="stat">{value}</text>
    <text y="45" class="date">{subValue}</text>
  </g>
)

export function GitHubStreakSVG({ 
  stats, 
  last7, 
  maxCount, 
  theme = 'transparent' 
}: { 
  stats: StreakStats, 
  last7: GitHubContributionDay[], 
  maxCount: number, 
  theme: Theme 
}) {
  const width = 420
  const height = 180
  const padding = 25
  const t = themes[theme] || themes.dark
  const dayLabels = last7.map(d => new Date(d.date).toLocaleDateString("en", { weekday: "short" })[0])

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>
        {`
        .label { font: bold 10px sans-serif; fill: ${t.textMuted}; text-transform: uppercase; letter-spacing: 1px; }
        .stat { font: bold 22px sans-serif; fill: ${t.text}; }
        .date { font: 10px sans-serif; fill: ${t.textMuted}; }
        .day { font: 9px sans-serif; fill: #ffffff; }
        .count { font: bold 11px sans-serif; fill: #ffffff; }
        `}
      </style>
      
      {t.bg !== 'none' && <rect width={width} height={height} rx="20" fill={t.bg}/>}
      {t.border !== 'none' && <rect x="0.5" y="0.5" width={width - 1} height={height - 1} rx="19.5" stroke={t.border}/>}

      {/* Stats row */}
      <StatItem 
        label="Current Streak" 
        value={`🔥 ${stats.current.count}`} 
        subValue={`${formatDate(stats.current.start)} - ${formatDate(stats.current.end)}`} 
        x={padding} 
        y={40} 
      />

      <StatItem 
        label="Personal Best" 
        value={`🏆 ${stats.max.count}`} 
        subValue={`${formatDate(stats.max.start)} - ${formatDate(stats.max.end)}`} 
        x={width / 2 - 50} 
        y={40} 
      />

      <StatItem 
        label="Total Contribs" 
        value={`✨ ${formatNumber(stats.total)}+`} 
        subValue={stats.yearRange || '---'} 
        x={width - padding - 105} 
        y={40} 
      />

      {/* Separators */}
      <line x1={width / 2 - 65} y1="40" x2={width / 2 - 65} y2="85" stroke={theme === 'transparent' ? '#00000010' : t.border} stroke-width="1" />
      <line x1={width / 2 + 75} y1="40" x2={width / 2 + 75} y2="85" stroke={theme === 'transparent' ? '#00000010' : t.border} stroke-width="1" />

      {/* Heat Strip */}
      <g transform={`translate(${padding}, 110)`}>
        {last7.map((d, i) => {
          const rectW = (width - 2 * padding - 6 * 8) / 7
          const x = i * (rectW + 8)
          const color = getIntensityColor(d.contributionCount, maxCount)
          return (
            <g transform={`translate(${x}, 0)`} key={d.date}>
              <rect width={rectW} height="40" rx="6" fill={color}/>
              <text x={rectW / 2} y="11" class="day" text-anchor="middle" dominant-baseline="central" opacity="0.8">{dayLabels[i]}</text>
              <text x={rectW / 2} y="30" class="count" text-anchor="middle" dominant-baseline="central">{d.contributionCount}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
