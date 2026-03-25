/** @jsxImportSource hono/jsx */
import { html } from 'hono/html'
import pkg from '../../package.json' with { type: 'json' }

export function LandingPage({ origin = '' }: { origin?: string }) {
  const initialUser = ''
  const initialTheme = 'dark'
  const version = pkg.version
  const sampleUrl = `${origin}/sample.svg?theme=${initialTheme}&v=${version}`
  const initialMarkdown = `![GitHub Streak](${origin}/?user=YOUR_USERNAME&theme=${initialTheme}&v=${version})`
  const initialHtml = `<img src="${origin}/?user=YOUR_USERNAME&theme=${initialTheme}&v=${version}" alt="GitHub Streak" />`
  const escapedHtml = initialHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return (
    <>
      {html`<!DOCTYPE html>`}
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>GitHub Streak | Streak Widget Generator</title>
          <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔥</text></svg>" />
          <style>
            {html`
            :root { --bg: #ffffff; --text: #1a1a1a; --muted: #666666; --border: #e1e4e8; --accent: #2c974b; --error: #d73a49; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; margin: 0; padding: 1rem; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
            .container { width: 100%; max-width: 600px; }
            h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; text-align: center; }
            p { color: var(--muted); text-align: center; margin-bottom: 2rem; font-size: 0.9rem; }
            .card { border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .form-group { margin-bottom: 1.5rem; }
            label { display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--muted); margin-bottom: 0.5rem; }
            .input-group { display: flex; gap: 0.5rem; }
            input { flex: 1; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box; font-size: 1rem; min-width: 0; }
            .generate-btn { padding: 0.75rem 1.25rem; background: var(--text); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; white-space: nowrap; }
            .generate-btn:hover { background: #333; }
            .themes { display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
            .themes button { flex: 1; padding: 0.5rem; border: 1px solid var(--border); background: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; min-width: 80px; }
            .themes button.active { background: var(--text); color: white; border-color: var(--text); }
            .preview-container { position: relative; display: flex; justify-content: center; align-items: center; border: 1px solid var(--border); border-radius: 8px; padding: 1rem; background: #f6f8fa; margin-top: 1rem; min-height: 120px; overflow: hidden; }
            .preview-img { max-width: 100%; height: auto; transition: opacity 0.3s ease; }
            .loading-overlay { display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(246, 248, 250, 0.8); display: none; flex-direction: column; justify-content: center; align-items: center; z-index: 10; font-size: 0.8rem; font-weight: 500; color: var(--text); }
            .loading-msg { margin-top: 0.5rem; color: var(--muted); font-size: 0.7rem; max-width: 250px; text-align: center; line-height: 1.4; }
            .error-banner { display: none; background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; padding: 0.75rem; border-radius: 6px; font-size: 0.8rem; margin-top: 1rem; text-align: center; }
            .error-banner a { color: #c53030; font-weight: 600; text-decoration: underline; }
            .code-box { position: relative; margin-top: 1.5rem; }
            pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; margin: 0; color: #24292e; border: 1px solid var(--border); }
            .copy-btn { position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.4rem 0.8rem; border: 1px solid var(--border); background: white; border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .copy-btn:active { background: #f3f4f6; }
            .footer { margin-top: 2rem; font-size: 0.75rem; color: var(--muted); text-align: center; }
            .footer a { color: inherit; text-decoration: none; border-bottom: 1px solid var(--border); }

            @media (max-width: 480px) {
              body { padding: 1rem 0.5rem; }
              .input-group { flex-direction: column; }
              .generate-btn { width: 100%; }
              .card { padding: 1rem; border-radius: 8px; }
              .themes button { font-size: 0.75rem; padding: 0.4rem; }
            }
            `}
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔥 GitHub Streak <span style="font-size: 0.7rem;">v{version}</span></h1>
            <p>Generate a Duolingo-inspired GitHub streak widget for your profile.</p>

            <div class="card">
              <div class="form-group">
                <label>GitHub Username</label>
                <div class="input-group">
                  <input type="text" id="username" placeholder="Enter GitHub username" value={initialUser} autocomplete="off" />
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

              <div id="error-banner" class="error-banner"></div>

              <div class="preview-container">
                <div id="loading-overlay" class="loading-overlay">
                  <div>Generating...</div>
                  <div class="loading-msg">Accounts with years of history might take a few seconds to calculate first time.</div>
                </div>
                <img id="preview-img" class="preview-img" src={sampleUrl} alt="GitHub Streak Preview" />
              </div>
              
              <label style={{ marginTop: '1.5rem', display: 'block' }}>Markdown</label>
              <div class="code-box">
                <pre id="md-code">{initialMarkdown}</pre>
                <button class="copy-btn" onclick="copy('md-code', this)">Copy</button>
              </div>
    
              <label style={{ marginTop: '1.5rem', display: 'block' }}>HTML</label>
              <div class="code-box">
                <pre id="html-code">{escapedHtml}</pre>
                <button class="copy-btn" onclick="copy('html-code', this)">Copy</button>
              </div>
            </div>


            <div class="footer">
              Built by <a href="https://rahuldhole.com" target="_blank">Rahul Dhole</a> | 
              <a href="https://github.com/rahuldhole/github-streak" target="_blank">GitHub Repository</a>
              <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text)', fontWeight: '500' }}>
                💡 <b>Pro Tip:</b> If your streak looks stale after deleting years old repos, add <code>&no-cache=true</code> to your URL to force a refresh.
              </p>
              <p style={{ marginTop: '1rem', fontSize: '0.7rem' }}>
                Notice an error? Please open a <a href="https://github.com/rahuldhole/github-streak/issues" target="_blank">GitHub Issue</a> or <a href="https://github.com/rahuldhole/github-streak/pulls" target="_blank">Pull Request</a>.
              </p>
            </div>
          </div>

          {html`
          <script>
            let theme = '${initialTheme}';
            const version = '${version}';
            const usernameInput = document.getElementById('username');
            const previewImg = document.getElementById('preview-img');
            const loadingOverlay = document.getElementById('loading-overlay');
            const mdCode = document.getElementById('md-code');
            const htmlCode = document.getElementById('html-code');
            const errorBanner = document.getElementById('error-banner');
            const generateBtn = document.querySelector('.generate-btn');

            const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

            async function update() {
              const user = usernameInput.value.trim();
              
              if (!user || !GITHUB_USERNAME_REGEX.test(user)) {
                if (!user) return; // Silent return if empty
                usernameInput.style.borderColor = '#d73a49';
                usernameInput.style.boxShadow = '0 0 0 3px rgba(215, 58, 73, 0.1)';
                generateBtn.textContent = 'Invalid User';
                setTimeout(() => {
                  usernameInput.style.borderColor = '';
                  usernameInput.style.boxShadow = '';
                  generateBtn.textContent = 'Generate';
                }, 2000);
                return;
              }

              errorBanner.style.display = 'none';
              loadingOverlay.style.display = 'flex';
              previewImg.style.opacity = '0';

              const baseUrl = window.location.origin;
              const cardUrl = \`\${baseUrl}/?user=\${user}&theme=\${theme}&v=\${version}\`;
              
              generateBtn.textContent = 'Generating...';
              generateBtn.disabled = true;
              generateBtn.style.opacity = '0.7';

              try {
                const response = await fetch(cardUrl);
                if (!response.ok) {
                  let message = 'Something went wrong.';
                  if (response.status === 404) message = 'GitHub User not found.';
                  if (response.status === 429) message = 'Too many requests. Please slow down.';
                  if (response.status === 503) message = 'GitHub API is unavailable or rate limited.';
                  
                  errorBanner.innerHTML = \`\${message} Please try again or <a href="https://github.com/rahuldhole/github-streak/issues" target="_blank">create an issue</a>.\`;
                  errorBanner.style.display = 'block';
                  generateBtn.textContent = 'Error';
                } else {
                  // Wait for the browser to actually finish fetching AND rendering the SVG bytes
                  const onloadPromise = new Promise((resolve) => {
                    previewImg.onload = resolve;
                    previewImg.onerror = resolve; // Continue reveal even if image is broken
                  });
                  previewImg.src = cardUrl;
                  await onloadPromise;

                  const markdown = \`![GitHub Streak](\${cardUrl})\`;
                  const htmlStr = \`<img src="\${cardUrl}" alt="GitHub Streak" />\`;
                  mdCode.textContent = markdown;
                  htmlCode.textContent = htmlStr;
                  generateBtn.textContent = 'Generate';
                }
              } catch (err) {
                errorBanner.innerHTML = \`Network error. Please try again or <a href="https://github.com/rahuldhole/github-streak/issues" target="_blank">create an issue</a>.\`;
                errorBanner.style.display = 'block';
                generateBtn.textContent = 'Error';
              } finally {
                loadingOverlay.style.display = 'none';
                previewImg.style.opacity = '1';
                generateBtn.disabled = false;
                generateBtn.style.opacity = '1';
                if (generateBtn.textContent === 'Error') {
                  setTimeout(() => {
                    generateBtn.textContent = 'Generate';
                  }, 2000);
                }
              }
            }

            function setTheme(t) {
              theme = t;
              document.querySelectorAll('.themes button').forEach(b => b.classList.remove('active'));
              document.getElementById('theme-' + t).classList.add('active');
              
              if (usernameInput.value.trim()) {
                update();
              } else {
                previewImg.src = \`\${window.location.origin}/sample.svg?theme=\${theme}&v=\${version}\`;
              }
            }

            function copy(id, btn) {
              const text = document.getElementById(id).textContent.trim();
              const original = btn.textContent;
              
              const handleSuccess = () => {
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = original, 2000);
              };

              const fallbackCopy = () => {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                textArea.setSelectionRange(0, 99999);
                try {
                  document.execCommand('copy');
                  handleSuccess();
                } catch (err) {
                  console.error('All copy methods failed', err);
                }
                document.body.removeChild(textArea);
              };

              if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                  .then(handleSuccess)
                  .catch(() => fallbackCopy());
              } else {
                fallbackCopy();
              }
            }

            if (usernameInput) {
              usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') update();
              });
            }
          </script>
          `}
        </body>
      </html>
    </>
  )
}
