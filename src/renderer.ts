import { GitHubContributionDay, Theme } from './types'
import { getIntensityColor, StreakStats } from './logic'

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

export function renderSVG(stats: StreakStats, last7: GitHubContributionDay[], maxCount: number, theme: Theme = 'transparent') {
  const width = 420
  const height = 180
  const padding = 25

  const themes = {
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

  const t = themes[theme] || themes.dark
  const dayLabels = last7.map(d => new Date(d.date).toLocaleDateString("en", { weekday: "short" })[0])

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>
        .label { font: bold 10px sans-serif; fill: ${t.textMuted}; text-transform: uppercase; letter-spacing: 1px; }
        .stat { font: bold 22px sans-serif; fill: ${t.text}; }
        .date { font: 10px sans-serif; fill: ${t.textMuted}; }
        .day { font: 9px sans-serif; fill: #ffffff; }
        .count { font: bold 11px sans-serif; fill: #ffffff; }
      </style>
      
      ${t.bg !== 'none' ? `<rect width="${width}" height="${height}" rx="20" fill="${t.bg}"/>` : ''}
      ${t.border !== 'none' ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="19.5" stroke="${t.border}"/>` : ''}

      <!-- Current Streak -->
      <g transform="translate(${padding}, 40)">
        <text class="label">Current Streak</text>
        <text y="28" class="stat">🔥 ${stats.current.count}</text>
        <text y="45" class="date">${formatDate(stats.current.start)} - ${formatDate(stats.current.end)}</text>
      </g>

      <!-- Max Streak -->
      <g transform="translate(${width / 2 - 50}, 40)">
        <text class="label">Personal Best</text>
        <text y="28" class="stat">🏆 ${stats.max.count}</text>
        <text y="45" class="date">${formatDate(stats.max.start)} - ${formatDate(stats.max.end)}</text>
      </g>

      <!-- Total Contributions -->
      <g transform="translate(${width - padding - 105}, 40)">
        <text class="label">Total Contribs</text>
        <text y="28" class="stat">✨ ${formatNumber(stats.total)}+</text>
        <text y="45" class="date">${stats.yearRange}</text>
      </g>

      <!-- Separators -->
      <line x1="${width / 2 - 65}" y1="40" x2="${width / 2 - 65}" y2="85" stroke="${theme === 'transparent' ? '#00000010' : t.border}" stroke-width="1" />
      <line x1="${width / 2 + 75}" y1="40" x2="${width / 2 + 75}" y2="85" stroke="${theme === 'transparent' ? '#00000010' : t.border}" stroke-width="1" />

      <!-- Heat Strip -->
      <g transform="translate(${padding}, 110)">
        ${last7.map((d, i) => {
    const rectW = (width - 2 * padding - 6 * 8) / 7
    const x = i * (rectW + 8)
    const color = getIntensityColor(d.contributionCount, maxCount)
    return `
            <g transform="translate(${x}, 0)">
              <rect width="${rectW}" height="40" rx="6" fill="${color}"/>
              <text x="${rectW / 2}" y="15" class="day" text-anchor="middle" opacity="0.8">${dayLabels[i]}</text>
              <text x="${rectW / 2}" y="28" class="count" text-anchor="middle">${d.contributionCount}</text>
            </g>
          `
  }).join('')}
      </g>
    </svg>
  `
}

export function renderLandingPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Streak Pulse | GitHub Streak Widget</title>
        <style>
          :root { --bg: #ffffff; --text: #1a1a1a; --muted: #666666; --border: #e1e4e8; --accent: #2c974b; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; margin: 0; padding: 2rem; display: flex; flex-direction: column; align-items: center; }
          .container { width: 100%; max-width: 600px; }
          h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; text-align: center; }
          p { color: var(--muted); text-align: center; margin-bottom: 2rem; font-size: 0.9rem; }
          .card { border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; }
          .form-group { margin-bottom: 1.5rem; }
          label { display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--muted); margin-bottom: 0.5rem; }
          .input-group { display: flex; gap: 0.5rem; }
          input { flex: 1; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box; font-size: 1rem; }
          .generate-btn { padding: 0.75rem 1.25rem; background: var(--text); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; white-space: nowrap; }
          .generate-btn:hover { background: #333; }
          .themes { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
          .themes button { flex: 1; padding: 0.5rem; border: 1px solid var(--border); background: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
          .themes button.active { background: var(--text); color: white; border-color: var(--text); }
          .preview { display: flex; justify-content: center; align-items: center; border: 1px solid var(--border); border-radius: 8px; padding: 1rem; background: #f6f8fa; margin-top: 1.5rem; min-height: 160px; }
          .preview img { max-width: 100%; height: auto; }
          .code-box { position: relative; margin-top: 1.5rem; }
          pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; font-size: 0.85rem; overflow-x: auto; margin: 0; color: #24292e; border: 1px solid var(--border); }
          .copy-btn { position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.4rem 0.8rem; border: 1px solid var(--border); background: white; border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-weight: 600; }
          .copy-btn:active { background: #f3f4f6; }
          .footer { margin-top: 3rem; font-size: 0.75rem; color: var(--muted); text-align: center; }
          .footer a { color: inherit; text-decoration: none; border-bottom: 1px solid var(--border); }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔥 Streak Pulse</h1>
          <p>A Duolingo-inspired GitHub streak widget.</p>

          <div class="card">
            <div class="form-group">
              <label>GitHub Username</label>
              <div class="input-group">
                <input type="text" id="username" placeholder="username" value="rahuldhole">
                <button class="generate-btn" onclick="update()">Generate</button>
              </div>
            </div>

            <div class="form-group">
              <label>Theme</label>
              <div class="themes">
                <button onclick="setTheme('transparent')" id="theme-transparent">Transparent</button>
                <button onclick="setTheme('light')" id="theme-light">Light</button>
                <button onclick="setTheme('dark')" id="theme-dark" class="active">Dark</button>
              </div>
            </div>

            <div class="preview">
              <img id="preview-img" src="/?user=rahuldhole" alt="Streak Pulse Preview">
            </div>
            
            <label style="margin-top: 1.5rem;">Markdown</label>
            <div class="code-box">
              <pre id="md-code"></pre>
              <button class="copy-btn" onclick="copy('md-code')">Copy</button>
            </div>
  
            <label style="margin-top: 1.5rem;">HTML</label>
            <div class="code-box">
              <pre id="html-code"></pre>
              <button class="copy-btn" onclick="copy('html-code')">Copy</button>
            </div>
          </div>


          <div class="footer">
            Built by <a href="https://github.com/rahuldhole/streak-pulse" target="_blank">Streak Pulse</a>
          </div>
        </div>

        <script>
          let theme = 'dark';
          const usernameInput = document.getElementById('username');
          const previewImg = document.getElementById('preview-img');
          const mdCode = document.getElementById('md-code');
          const htmlCode = document.getElementById('html-code');

          function update() {
            const user = usernameInput.value || 'username';
            const baseUrl = window.location.origin;
            const cardUrl = \`\${baseUrl}/?user=\${user}&theme=\${theme}\`;
            
            previewImg.src = cardUrl;
            
            const markdown = \`![Streak Pulse](\${cardUrl})\`;
            const html = \`<img src="\${cardUrl}" alt="Streak Pulse" />\`;
            
            mdCode.textContent = markdown;
            htmlCode.textContent = html;
          }

          function setTheme(t) {
            theme = t;
            document.querySelectorAll('.themes button').forEach(b => b.classList.remove('active'));
            document.getElementById('theme-' + t).classList.add('active');
            update();
          }

          function copy(id) {
            const text = document.getElementById(id).textContent;
            navigator.clipboard.writeText(text);
            const btn = event.target;
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = original, 2000);
          }

          usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') update();
          });
          update();
        </script>
      </body>
    </html>
  `
}
