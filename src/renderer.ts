import { GitHubContributionDay, Theme } from './types'
import { getIntensityColor } from './logic'

export function renderSVG(streak: number, last7: GitHubContributionDay[], maxCount: number, theme: Theme = 'transparent') {
  const width = 420
  const height = 160
  const padding = 20

  const themes = {
    light: {
      bg: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B',
    },
    dark: {
      bg: '#0B1220',
      border: '#1E293B',
      text: '#FFFFFF',
      textMuted: '#94A3B8',
    },
    transparent: {
      bg: 'none',
      border: 'none',
      text: '#626a75ff',
      textMuted: '#576374ff',
    }
  }

  const t = themes[theme] || themes.dark
  const dayLabels = last7.map(d => new Date(d.date).toLocaleDateString("en", { weekday: "short" })[0])

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${t.bg !== 'none' ? `<rect width="${width}" height="${height}" rx="16" fill="${t.bg}"/>` : ''}
      ${t.border !== 'none' ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="15.5" stroke="${t.border}"/>` : ''}

      <!-- Streak Text -->
      <text x="${padding}" y="40" fill="${t.text}" font-family="sans-serif" font-size="20" font-weight="bold">
        🔥 ${streak} day streak
      </text>
      <text x="${padding}" y="60" fill="${t.textMuted}" font-family="sans-serif" font-size="12">
        based on consecutive contribution days
      </text>

      <!-- Heat Strip -->
      ${last7.map((d, i) => {
    const x = padding + i * ((width - 2 * padding - 6 * 8) / 7 + 8)
    const rectW = (width - 2 * padding - 6 * 8) / 7
    const color = getIntensityColor(d.contributionCount, maxCount)
    return `
          <g>
            <rect x="${x}" y="85" width="${rectW}" height="45" rx="8" fill="${color}"/>
            <text x="${x + rectW / 2}" y="105" fill="#ffffffff" font-family="sans-serif" font-size="10" text-anchor="middle">
              ${dayLabels[i]}
            </text>
            <text x="${x + rectW / 2}" y="120" fill="#ffffffff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">
              ${d.contributionCount}
            </text>
          </g>
        `
  }).join('')}
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
        <title>Streak Pulse | Your GitHub Consistency</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Inter:wght@400;500&display=swap" rel="stylesheet">
        <style>
          body {
            background-color: #0B1220;
            color: white;
            font-family: 'Inter', sans-serif;
            background-image: radial-gradient(circle at 50% -20%, #1e293b 0%, #0b1220 50%);
          }
          .glass { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); }
          .font-outfit { font-family: 'Outfit', sans-serif; }
          #preview-container { min-height: 160px; display: flex; align-items: center; justify-content: center; }
          .tab-btn.active { background: #22c55e; color: #0b1220; }
        </style>
      </head>
      <body class="min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
        <div class="w-full max-w-xl space-y-12">
          <!-- Header -->
          <div class="text-center space-y-2">
            <h1 class="text-4xl font-black font-outfit tracking-tighter uppercase">🔥 STREAK <span class="text-green-500">PULSE</span></h1>
            <p class="text-slate-400 font-medium">Your GitHub consistency, reimagined.</p>
          </div>

          <!-- Interaction Card -->
          <div class="glass rounded-[2rem] p-8 md:p-10 shadow-2xl space-y-8 transition-all hover:border-green-500/20">
            <div class="space-y-6">
              <div class="space-y-3">
                <label class="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">GitHub Username</label>
                <input type="text" id="username" placeholder="e.g., rahuldhole" 
                  class="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all text-xl font-bold font-outfit">
              </div>

              <div class="flex items-center justify-between space-x-2">
                <div class="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 w-full">
                  <button onclick="setTheme('transparent')" id="theme-transparent" class="tab-btn active flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all">Transparent</button>
                  <button onclick="setTheme('dark')" id="theme-dark" class="tab-btn flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all">Dark</button>
                  <button onclick="setTheme('light')" id="theme-light" class="tab-btn flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all">Light</button>
                </div>
              </div>
            </div>

            <div id="preview-container" class="relative group">
              <div class="absolute inset-0 bg-green-500/5 blur-3xl rounded-full"></div>
              <img id="preview-img" src="/?user=rahuldhole" alt="Preview" 
                class="relative opacity-0 transition-opacity duration-1000 max-w-full" onload="this.style.opacity='1'">
            </div>

            <div class="space-y-4 pt-4 border-t border-white/5">
              <button onclick="copyMarkdown()" 
                class="w-full bg-green-500 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-wider font-outfit hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-500/20">
                Copy Markdown for README
              </button>
              <p id="feedback" class="text-center text-xs font-bold text-green-500 opacity-0 transition-opacity">Copied to clipboard!</p>
            </div>
          </div>

          <!-- Simple Footer -->
          <div class="text-center text-[10px] uppercase tracking-widest text-slate-600 font-black">
            <a href="https://github.com/rahuldhole/streak-pulse" target="_blank" class="hover:text-green-500 transition-colors">GitHub Repository</a>
          </div>
        </div>

        <script>
          let currentTheme = 'transparent';
          const usernameInput = document.getElementById('username');
          const previewImg = document.getElementById('preview-img');
          const feedback = document.getElementById('feedback');

          function updatePreview() {
            const user = usernameInput.value || 'rahuldhole';
            const url = \`/?user=\${user}&theme=\${currentTheme}\`;
            previewImg.src = url;
            previewImg.style.opacity = '0.5';
          }

          function setTheme(theme) {
            currentTheme = theme;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('theme-' + theme).classList.add('active');
            updatePreview();
          }

          usernameInput.addEventListener('input', updatePreview);

          function copyMarkdown() {
            const user = usernameInput.value || 'YOUR_NAME';
            const url = \`https://streak-pulse.rahuldhole.com/?user=\${user}&theme=\${currentTheme}\`;
            const markdown = \`![Streak Pulse](\${url})\`;
            navigator.clipboard.writeText(markdown).then(() => {
              feedback.style.opacity = '1';
              setTimeout(() => feedback.style.opacity = '0', 2000);
            });
          }
        </script>
      </body>
    </html>
  `
}
