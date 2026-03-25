# 🔥 Github Streak

A Duolingo-inspired GitHub activity streak widget that visualizes your coding consistency in real-time.

It turns your GitHub contributions into a **living motivation system** instead of a static graph.

**Demo:**

![Github Streak](https://github-streak.rahuldhole.com?user=rahuldhole&theme=dark)

---

## ⚡ What this is

Github Streak is a lightweight visual layer on top of your GitHub activity:

- 🔥 Daily streak tracking
- 📊 Commit intensity visualization
- 🟩 GitHub-style heat logic (relative scaling)
- ⚡ Embeddable into README or dashboards
- 🧠 Designed for behavioral motivation, not vanity metrics

---

## 🧠 Why it exists

GitHub shows your history.

Github Streak shows your **discipline**.

Most dev dashboards are passive. This one is intentionally visual:

- High activity → visually bold (you feel the momentum)
- Low activity → visually subtle (you feel the gap)

It’s not decoration. It’s feedback.

---

## 🧩 Demo

> Paste this into your browser:
embed it into a GitHub README:

```md
![Github Streak](https://github-streak.rahuldhole.com?user=your_github_user_name&theme=dark)

Themes: `transparent` (default), `light`, `dark`.
```

---

## 🎯 Core Features

### 🔥 Streak Engine

Tracks consecutive days with contributions using GitHub GraphQL data.

### 📊 Relative Intensity Mapping

- [x] Standard GitHub-style heat logic (darker = more active)

* Peak day -> strongest green
* Low activity -> light/subtle green

### 🟩 Heat Visualization

GitHub-style heat logic (relative scaling).

### ⚡ Minimal Integration

* Tailwind CDN
* Petite Vue (optional UI layer)
* No build step required

---

## 🧪 How it works

1. Fetch GitHub contributions via GraphQL API
2. Extract last N days activity
3. Compute:

   * streak length
   * max activity baseline
   * relative intensity per day
4. Render dynamic UI (or SVG for embedding)


---

## 🧭 Design Philosophy

This project is built on one principle:

> “What gets measured should change behavior.”

Instead of vanity stats, it focuses on:

* consistency
* feedback loops
* visual pressure
* habit reinforcement

---

## 🛠️ Development & Cache Management

### 🔄 Forced Cache Refresh

To force a full recalculation of the cache (history + current) for all users, update the `cacheStoreVersion` in `package.json`:

1.  Open `package.json`.
2.  Increment the `"cacheStoreVersion"` (e.g., change `"2"` to `"3"`).
3.  Deploy.

The system compares this version against the one stored in the cache. If the `package.json` version is higher, it triggers a full fetch from the GitHub API, ensuring your latest logic is applied to all data.

